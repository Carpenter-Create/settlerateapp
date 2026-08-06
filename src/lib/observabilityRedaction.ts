/**
 * Shared Sentry redaction policy for Phase 8.1 Epic 3 observability.
 *
 * Authority: docs/adr/0003-observability-policy.md §4–5.
 *
 * Fail-closed, allowlist-based scrubbing: only explicitly approved opaque
 * identifiers and generic status/error metadata are permitted through.
 * Everything else — mortgage inputs, financial figures, payment details,
 * credentials, tokens, cookies, headers, and raw personal information — is
 * dropped by default rather than merely pattern-matched against a denylist.
 *
 * Used as Sentry `beforeSend` / `beforeBreadcrumb` hooks by both the client
 * and Supabase Edge Functions so client and server capture the same policy.
 *
 * This module is intentionally duplicated byte-for-byte between
 * src/lib/observabilityRedaction.ts and
 * supabase/functions/_shared/observabilityRedaction.ts (the latter runs
 * under Deno and cannot import from src/). Both copies must stay identical
 * — edit one, copy to the other. Verified by the "observabilityRedaction
 * mirror sync" test in src/lib/__tests__/observabilityRedaction.test.ts.
 */

/** Allowlisted opaque identifier / generic metadata keys (ADR 0003 §4). Case-insensitive. */
const ALLOWED_KEYS = new Set([
  "user_id",
  "userid",
  "event_id",
  "eventid",
  "request_id",
  "requestid",
  "customer_id",
  "customerid",
  "subscription_id",
  "subscriptionid",
  "session_id",
  "sessionid",
  "scenario_id",
  "scenarioid",
  "comparison_id",
  "comparisonid",
  "price_id",
  "priceid",
  "product_id",
  "productid",
  "share_id",
  "shareid",
  "code",
  "status",
  "action_taken",
  "actiontaken",
  "entitlement_status",
  "entitlementstatus",
  "plan_code",
  "plancode",
  "function_name",
  "functionname",
  "environment",
  "release",
]);

// Free-text scanning for common secret/PII shapes that could leak into
// exception messages even when not carried in a keyed field. This is
// intentionally shape-based (tokens, emails, long digit runs), not a
// semantic/topic-based filter — see module comment for the rationale.
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_PATTERN = /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._-]+/gi;
// `whsec_` webhook secrets have no `live`/`test` segment, unlike sk/rk/pk keys.
const STRIPE_SECRET_PATTERN = /\b(?:(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+)\b/g;
// SSNs, card numbers, account numbers — excludes digit runs adjacent to a
// hyphen so hyphen-delimited opaque identifiers (e.g. UUIDs) are not
// partially mangled by this shape-based scan.
const LONG_DIGIT_PATTERN = /(?<![\w-])\d{9,}(?![\w-])/g;

const REDACTED = "[REDACTED]";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Scrubs free-text strings for common secret/PII shapes. Fail-closed: any internal error → fully redacted. */
export function scrubString(value: string): string {
  try {
    return value
      .replace(JWT_PATTERN, REDACTED)
      .replace(BEARER_PATTERN, REDACTED)
      .replace(STRIPE_SECRET_PATTERN, REDACTED)
      .replace(EMAIL_PATTERN, REDACTED)
      .replace(LONG_DIGIT_PATTERN, REDACTED);
  } catch {
    return REDACTED;
  }
}

/**
 * Allowlist-filters a plain object's keys; each retained string value is
 * further scrubbed. Non-scalar values on allowlisted keys are dropped —
 * only opaque identifiers and generic statuses are approved for capture.
 * Fail-closed on any internal error (returns an empty object).
 */
export function redactExtra(
  input: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!isPlainObject(input)) return {};
  try {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!ALLOWED_KEYS.has(key.toLowerCase())) continue;
      if (typeof value === "string") {
        output[key] = scrubString(value);
      } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
        output[key] = value;
      }
    }
    return output;
  } catch {
    return {};
  }
}

export interface MinimalBreadcrumb {
  category?: string;
  type?: string;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Breadcrumb categories considered safe enough to keep (after scrubbing). Everything else is dropped. */
const ALLOWED_BREADCRUMB_CATEGORIES = new Set(["navigation", "ui.click"]);

/**
 * Breadcrumb messages are free text (unlike allowlisted `extra`/`tags`
 * fields), so any detected secret/PII shape drops the *entire* message
 * rather than only the matched substring — a stricter, more conservative
 * fail-closed treatment than `scrubString` alone provides.
 */
function scrubBreadcrumbMessage(message: string): string {
  const scrubbed = scrubString(message);
  return scrubbed === message ? message : REDACTED;
}

/**
 * Fail-closed breadcrumb filter: drop anything not on an explicit
 * allowlist (this is the primary defense — automatic integrations that
 * would otherwise emit console/fetch/xhr breadcrumbs are also disabled at
 * the Sentry.init level); scrub what remains. Only echoes back fields that
 * were present on the input breadcrumb.
 */
export function redactBreadcrumb(
  breadcrumb: MinimalBreadcrumb | null | undefined
): MinimalBreadcrumb | null {
  if (!breadcrumb) return null;
  try {
    const category = (breadcrumb.category ?? "").toLowerCase();
    if (!ALLOWED_BREADCRUMB_CATEGORIES.has(category)) {
      return null;
    }
    const result: MinimalBreadcrumb = { category: breadcrumb.category };
    if (breadcrumb.type !== undefined) result.type = breadcrumb.type;
    if (typeof breadcrumb.message === "string") {
      result.message = scrubBreadcrumbMessage(breadcrumb.message);
    }
    if (breadcrumb.data !== undefined) result.data = redactExtra(breadcrumb.data);
    return result;
  } catch {
    return null;
  }
}

export interface MinimalExceptionValue {
  type?: string;
  value?: string;
  [key: string]: unknown;
}

export interface MinimalSentryEvent {
  message?: string;
  exception?: { values?: MinimalExceptionValue[] };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: MinimalBreadcrumb[];
  request?: unknown;
  user?: unknown;
  [key: string]: unknown;
}

/**
 * Fail-closed event scrubber for Sentry `beforeSend`. Strips request/user
 * objects entirely (no request/response body or PII capture per ADR 0003),
 * allowlist-filters extra/tags, drops free-form contexts, and scrubs
 * message/exception text. Any internal error drops the event rather than
 * risk sending unscrubbed data.
 */
export function redactEvent(
  event: MinimalSentryEvent | null | undefined
): MinimalSentryEvent | null {
  if (!event) return null;
  try {
    const redacted: MinimalSentryEvent = { ...event };
    delete redacted.request;
    delete redacted.user;

    if (typeof redacted.message === "string") {
      redacted.message = scrubString(redacted.message);
    }

    if (redacted.exception?.values) {
      redacted.exception = {
        values: redacted.exception.values.map((exceptionValue) => ({
          type: exceptionValue.type,
          value:
            typeof exceptionValue.value === "string"
              ? scrubString(exceptionValue.value)
              : exceptionValue.value,
        })),
      };
    }

    redacted.extra = redactExtra(redacted.extra);
    redacted.tags = redactExtra(redacted.tags);
    redacted.contexts = {};

    redacted.breadcrumbs = Array.isArray(redacted.breadcrumbs)
      ? redacted.breadcrumbs
          .map((breadcrumb) => redactBreadcrumb(breadcrumb))
          .filter((breadcrumb): breadcrumb is MinimalBreadcrumb => breadcrumb !== null)
      : [];

    return redacted;
  } catch {
    return null;
  }
}
