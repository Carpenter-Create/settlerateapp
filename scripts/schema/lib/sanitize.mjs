/**
 * Fail-closed secret-like content detection for Epic 6 PR 1 schema-capture
 * artifacts. Every artifact written to disk (or shown in a report) must pass
 * through this module first. On any match, the caller must throw and refuse
 * to write — never redact-and-continue at this layer (function bodies get a
 * dedicated, narrower redaction path in captureFromDatabase.mjs because they
 * are the one place secret-like literals are structurally expected to show
 * up, e.g. hardcoded webhook secrets in old trigger bodies).
 */

export class SecretLikeContentError extends Error {
  constructor(message, findings) {
    super(message);
    this.name = "SecretLikeContentError";
    this.findings = findings;
  }
}

// High-confidence patterns: shape alone is enough signal, independent of key name.
const SECRET_PATTERNS = [
  {
    name: "postgres_connection_string_with_password",
    regex: /postgres(?:ql)?:\/\/[^\s"'@/]+:[^\s"'@/]+@[^\s"']+/i,
  },
  {
    name: "jwt_like_token",
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  },
  {
    name: "stripe_secret_key",
    regex: /\bsk_(?:live|test)_[A-Za-z0-9]{8,}\b/,
  },
  {
    name: "stripe_webhook_secret",
    regex: /\bwhsec_[A-Za-z0-9]{8,}\b/,
  },
  {
    name: "service_role_key_assignment",
    regex: /service_role["'`]?\s*[:=]\s*["'`][A-Za-z0-9._-]{10,}["'`]/i,
  },
  {
    name: "password_query_param",
    regex: /[?&]password=[^&\s"']+/i,
  },
  {
    name: "generic_password_assignment",
    regex: /\bpassword["'`]?\s*[:=]\s*["'`][^"'`\s]{4,}["'`]/i,
  },
];

// Long hex runs (e.g. raw API keys) — but our own sha256 fingerprints and git
// SHAs are also long hex strings and are intentionally non-secret metadata.
// Callers pass the field's key name so we can allowlist those by name rather
// than by guessing content.
const LONG_HEX_SECRET = /\b[a-f0-9]{32,}\b/i;

const HASH_LIKE_KEY_NAMES = new Set([
  "gitsha",
  "fingerprint",
  "definitionfingerprint",
  "sha256",
  "hash",
  "contentfingerprint",
  "catalogfingerprint",
  "catalogcontentfingerprint",
  // Container keys whose *values* are hash maps (e.g.
  // production-schema-fingerprint.json's `perObject: { "table:x": "<sha256>" }`).
  // The map's own child keys (like "table:public.foo") don't themselves
  // contain the word "fingerprint", so the container name is allowlisted
  // instead — any string leaf directly inside one of these containers is
  // treated as hash-like.
  "perobject",
  "hashes",
  "objecthashes",
]);

function isHashLikeSegment(segment) {
  const lower = String(segment).toLowerCase();
  return (
    HASH_LIKE_KEY_NAMES.has(lower) ||
    lower.endsWith("fingerprint") ||
    lower.endsWith("sha") ||
    lower.endsWith("sha256") ||
    lower.endsWith("hash")
  );
}

/**
 * True if the immediate key OR any ancestor path segment identifies this
 * leaf as hash/fingerprint metadata — needed because comparison records
 * commonly nest hashes as `{ definitionFingerprint: { a, b } }`, where the
 * leaf's own key is just "a"/"b".
 */
function isHashLikeKey(keyNameOrPath) {
  if (!keyNameOrPath) return false;
  const segments = Array.isArray(keyNameOrPath) ? keyNameOrPath : [keyNameOrPath];
  return segments.some(isHashLikeSegment);
}

// Email-looking values are only checked when they show up as a full string
// value (not merely a substring of a larger identifier/type name like
// `character varying(255)`); SQL type names never contain `@`, so this is
// safe against that specific false-positive concern.
const EMAIL_LIKE = /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\b/;

// Non-PII domains already used deliberately by this repo's own SQL test
// fixtures (supabase/tests/*.sql, scripts/test-entitlement-sql.mjs). Emails
// on these domains are fixture artifacts, not secrets.
const ALLOWLISTED_EMAIL_DOMAINS = [/@test\.local$/i, /@example\.com$/i];

function isAllowlistedEmail(value) {
  return ALLOWLISTED_EMAIL_DOMAINS.some((re) => re.test(value.trim()));
}

/**
 * Scan a single string value for secret-like content. `keyName` (the
 * immediate JSON key the string was found under) or `path` (the full
 * ancestor chain, e.g. `["details", "definitionFingerprint", "a"]`) is used
 * only to allowlist known-safe hash/fingerprint fields against the
 * long-hex-secret rule — checking the full path matters because comparison
 * records commonly nest hashes as `{ definitionFingerprint: { a, b } }`.
 */
export function scanStringForSecrets(value, { keyName, path } = {}) {
  if (typeof value !== "string" || value.length === 0) return [];
  const findings = [];

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(value)) findings.push(pattern.name);
  }

  const hashContext = path ?? keyName;
  if (!isHashLikeKey(hashContext) && LONG_HEX_SECRET.test(value)) {
    findings.push("long_hex_secret");
  }

  const emailMatch = value.match(EMAIL_LIKE);
  if (emailMatch && !isAllowlistedEmail(emailMatch[0])) {
    findings.push("email_like_value");
  }

  return findings;
}

/**
 * Throws SecretLikeContentError if the raw string contains any high-
 * confidence secret pattern (connection string, JWT, Stripe key, etc).
 * Does not apply the long-hex-secret or email heuristics, since raw full-
 * artifact text legitimately contains many hash fields; use
 * `assertCatalogIsSafeToWrite` for the structured, key-aware scan.
 */
export function assertNoHighConfidenceSecrets(text, context = "artifact") {
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(text)) findings.push(pattern.name);
  }
  if (findings.length > 0) {
    throw new SecretLikeContentError(
      `Refusing to write ${context}: secret-like content detected (${findings.join(", ")})`,
      findings
    );
  }
}

/**
 * Recursively walk a JSON-shaped value, collecting {path, reasons} findings
 * for every string leaf that trips a secret-like pattern.
 */
export function collectSecretFindings(value, path = []) {
  const findings = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...collectSecretFindings(item, [...path, String(index)]));
    });
    return findings;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      findings.push(...collectSecretFindings(child, [...path, key]));
    }
    return findings;
  }

  if (typeof value === "string") {
    const reasons = scanStringForSecrets(value, { path });
    if (reasons.length > 0) {
      findings.push({ path: path.join("."), reasons });
    }
  }

  return findings;
}

/**
 * Fail-closed guard: throws if any secret-like content is found anywhere in
 * the object tree. Call this immediately before writing any Epic 6 PR 1
 * artifact to disk.
 */
export function assertCatalogIsSafeToWrite(catalogObj) {
  const findings = collectSecretFindings(catalogObj);
  if (findings.length > 0) {
    const detail = findings
      .map((f) => `${f.path || "(root)"} [${f.reasons.join(",")}]`)
      .join("; ");
    throw new SecretLikeContentError(
      `Refusing to write artifact: secret-like content found at: ${detail}`,
      findings
    );
  }
  return true;
}

/**
 * Narrow redaction path for SQL function/trigger definitions only. Never
 * used for the rest of the catalog — everywhere else we fail closed instead
 * of silently redacting.
 */
export function redactIfSecretLike(definitionText) {
  if (!definitionText) {
    return { text: definitionText ?? "", containsSecretLikeLiteral: false, redacted: false };
  }
  const findings = scanStringForSecrets(definitionText, { keyName: "definition" });
  if (findings.length === 0) {
    return { text: definitionText, containsSecretLikeLiteral: false, redacted: false };
  }
  return {
    text: `<redacted: secret-like literal detected in definition (${findings.join(", ")})>`,
    containsSecretLikeLiteral: true,
    redacted: true,
  };
}

/**
 * Assert that a required env var holding a connection string is present,
 * without ever logging or echoing its value.
 */
export function requireDatabaseUrlEnv(envVarName) {
  const value = process.env[envVarName];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `${envVarName} is required and must not be empty. Refusing to proceed without an explicit, read-only-intent connection string. (Value is never logged.)`
    );
  }
  return value;
}
