/**
 * Stable hashing helpers for schema-capture artifacts (Epic 6 PR 1).
 * Fingerprints must be stable across two captures of the same underlying
 * schema, regardless of catalog query result ordering — callers should
 * normalize (see normalize.mjs) before fingerprinting a whole catalog.
 */
import { createHash } from "node:crypto";
import { stableStringify } from "./normalize.mjs";

export function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Fingerprint an arbitrary JSON-shaped value: canonicalize key order, then
 * hash the resulting deterministic string.
 */
export function fingerprintValue(value) {
  return sha256Hex(stableStringify(value));
}

/**
 * Fingerprint raw text (e.g. an already-normalized function definition).
 */
export function fingerprintText(text) {
  return sha256Hex(text ?? "");
}

/**
 * Build a `${section}:schema.name[:extra]` -> fingerprint map for every
 * object in a normalized catalog. Used for
 * docs/database/production-schema/production-schema-fingerprint.json and for
 * definition_mismatch / constraint_index_mismatch drift detection.
 *
 * Volatile per-capture fields (capturedAt, gitSha, tooling, readOnly) are
 * excluded from each object's fingerprint input since they vary run-to-run
 * for the *same* schema and would otherwise make fingerprints useless for
 * drift comparison.
 */
export function fingerprintCatalogObjects(normalizedCatalog) {
  const out = {};

  for (const table of normalizedCatalog.tables ?? []) {
    const key = `table:${table.schema}.${table.name}`;
    out[key] = fingerprintValue(table);
  }
  for (const view of normalizedCatalog.views ?? []) {
    const key = `view:${view.schema}.${view.name}`;
    out[key] = fingerprintValue(view);
  }
  for (const en of normalizedCatalog.enums ?? []) {
    const key = `enum:${en.schema}.${en.name}`;
    out[key] = fingerprintValue(en);
  }
  for (const fn of normalizedCatalog.functions ?? []) {
    const key = `function:${fn.schema}.${fn.name}(${fn.identityArgs ?? ""})`;
    out[key] = fingerprintValue(fn);
  }
  for (const trg of normalizedCatalog.triggers ?? []) {
    const key = `trigger:${trg.schema}.${trg.table}.${trg.name}`;
    out[key] = fingerprintValue(trg);
  }
  for (const con of normalizedCatalog.constraints ?? []) {
    const key = `constraint:${con.schema}.${con.table}.${con.name}`;
    out[key] = fingerprintValue(con);
  }
  for (const idx of normalizedCatalog.indexes ?? []) {
    const key = `index:${idx.schema}.${idx.table}.${idx.name}`;
    out[key] = fingerprintValue(idx);
  }
  for (const pol of normalizedCatalog.policies ?? []) {
    const key = `policy:${pol.schema}.${pol.table}.${pol.name}`;
    out[key] = fingerprintValue(pol);
  }
  for (const ext of normalizedCatalog.extensions ?? []) {
    const key = `extension:${ext.schema ?? ""}.${ext.name}`;
    out[key] = fingerprintValue(ext);
  }

  return out;
}

/**
 * Whole-catalog content fingerprint: hash of the sorted per-object
 * fingerprint map itself, i.e. a fingerprint of fingerprints. Two captures
 * of an identical schema produce the same value even if capturedAt differs.
 */
export function fingerprintCatalogContent(normalizedCatalog) {
  const perObject = fingerprintCatalogObjects(normalizedCatalog);
  return fingerprintValue(perObject);
}
