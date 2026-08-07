/**
 * Lightweight structural parser for the generated Supabase PostgREST types
 * file (`src/integrations/supabase/types.ts`). This file is a *derived*
 * artifact (ADR 0006 §1 item 5) — never a schema authority — but drift
 * classification needs to compare it against migration/production reality
 * (`generated_types_mismatch`).
 *
 * The parser does not implement a general TypeScript grammar. It relies on
 * the fixed, mechanically-generated shape the Supabase CLI produces: nested
 * `key: { ... }` object literals and `key: [ ... ]` array literals, matched
 * by brace/bracket depth rather than indentation (robust to reformatting).
 * It is intentionally narrow — enough to extract table/view column names,
 * function arg/return shapes, and enum values, not to fully typecheck TS.
 */

/**
 * Split the interior of a balanced `{ ... }` block into top-level
 * `{ key, raw, isBlock, isArray }` entries, using bracket-depth matching
 * rather than commas/newlines (so nested object/array values are captured
 * whole).
 */
export function splitTopLevelEntries(content) {
  const entries = [];
  let i = 0;
  const n = content.length;

  while (i < n) {
    while (i < n && /[\s,;]/.test(content[i])) i++;
    if (i >= n) break;

    const rest = content.slice(i);
    const keyMatch = rest.match(/^("(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*)\s*:\s*/);
    if (!keyMatch) {
      // Not a recognizable `key:` start (e.g. stray comment/token) — skip
      // one character defensively rather than looping forever.
      i++;
      continue;
    }
    const rawKey = keyMatch[1].replace(/^"|"$/g, "");
    i += keyMatch[0].length;

    if (content[i] === "{") {
      let depth = 0;
      const start = i;
      for (; i < n; i++) {
        if (content[i] === "{") depth++;
        else if (content[i] === "}") {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
      let isArray = false;
      // e.g. `Returns: { ... }[]`
      if (content.slice(i, i + 2) === "[]") {
        isArray = true;
        i += 2;
      }
      entries.push({ key: rawKey, raw: content.slice(start + 1, i - (isArray ? 3 : 1)), isBlock: true, isArray });
      continue;
    }

    if (content[i] === "[") {
      let depth = 0;
      const start = i;
      for (; i < n; i++) {
        if (content[i] === "[") depth++;
        else if (content[i] === "]") {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
      entries.push({ key: rawKey, raw: content.slice(start, i), isBlock: false, isArray: true });
      continue;
    }

    // Scalar type values are terminated by a newline (multi-line pretty
    // printed format) or a semicolon (single-line `{ a: string; b: number }`
    // shorthand the generator also emits for small Args/Row blocks).
    const start = i;
    while (i < n && content[i] !== "\n" && content[i] !== ";") i++;
    entries.push({ key: rawKey, raw: content.slice(start, i).trim(), isBlock: false, isArray: false });
  }

  return entries;
}

function entryMap(entries) {
  const map = {};
  for (const entry of entries) map[entry.key] = entry;
  return map;
}

/**
 * Extract the substring inside the first balanced `{ ... }` that begins at
 * or after `fromIndex` and is introduced by `label` (e.g. "export type
 * Database = "). Returns { content, endIndex } or null if not found.
 */
function extractLabeledBlock(source, label, fromIndex = 0) {
  const labelIndex = source.indexOf(label, fromIndex);
  if (labelIndex === -1) return null;
  const braceIndex = source.indexOf("{", labelIndex);
  if (braceIndex === -1) return null;

  let depth = 0;
  let i = braceIndex;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return { content: source.slice(braceIndex + 1, i - 1), endIndex: i };
}

function parseRowColumns(rowEntry) {
  if (!rowEntry || !rowEntry.isBlock) return [];
  return splitTopLevelEntries(rowEntry.raw).map((entry) => ({
    name: entry.key,
    tsType: entry.raw,
    nullable: /\|\s*null\b/.test(entry.raw),
  }));
}

function parseArgs(argsEntry) {
  if (!argsEntry) return [];
  if (!argsEntry.isBlock) return []; // `Args: never`
  return splitTopLevelEntries(argsEntry.raw).map((entry) => ({
    name: entry.key.replace(/\?$/, ""),
    tsType: entry.raw,
    optional: entry.key.endsWith("?"),
  }));
}

function parseReturns(returnsEntry) {
  if (!returnsEntry) return { shape: "unknown", raw: null };
  if (returnsEntry.isBlock) {
    const columns = splitTopLevelEntries(returnsEntry.raw).map((entry) => ({
      name: entry.key,
      tsType: entry.raw,
    }));
    return { shape: returnsEntry.isArray ? "row_array" : "row", columns };
  }
  return { shape: "scalar", raw: returnsEntry.raw };
}

function parseEnumValues(raw) {
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^"|"$/g, ""));
}

/**
 * Parse the generated types.ts source text into a normalized shape used by
 * compareDrift.mjs. Only the `public` schema is parsed (this repo's
 * generated types file does not currently emit other schemas).
 */
export function parseSupabaseTypes(source) {
  const databaseBlock = extractLabeledBlock(source, "export type Database = ");
  if (!databaseBlock) {
    throw new Error("parseSupabaseTypes: could not locate `export type Database = { ... }`");
  }
  const databaseEntries = entryMap(splitTopLevelEntries(databaseBlock.content));
  const publicEntry = databaseEntries.public;
  if (!publicEntry || !publicEntry.isBlock) {
    throw new Error("parseSupabaseTypes: could not locate `public: { ... }` schema block");
  }
  const publicEntries = entryMap(splitTopLevelEntries(publicEntry.raw));

  const tables = {};
  if (publicEntries.Tables?.isBlock) {
    for (const tableEntry of splitTopLevelEntries(publicEntries.Tables.raw)) {
      if (!tableEntry.isBlock) continue;
      const tableFields = entryMap(splitTopLevelEntries(tableEntry.raw));
      tables[tableEntry.key] = {
        columns: parseRowColumns(tableFields.Row),
      };
    }
  }

  const views = {};
  if (publicEntries.Views?.isBlock) {
    for (const viewEntry of splitTopLevelEntries(publicEntries.Views.raw)) {
      if (!viewEntry.isBlock) continue;
      const viewFields = entryMap(splitTopLevelEntries(viewEntry.raw));
      views[viewEntry.key] = {
        columns: parseRowColumns(viewFields.Row),
      };
    }
  }

  const functions = {};
  if (publicEntries.Functions?.isBlock) {
    for (const fnEntry of splitTopLevelEntries(publicEntries.Functions.raw)) {
      if (!fnEntry.isBlock) continue;
      const fnFields = entryMap(splitTopLevelEntries(fnEntry.raw));
      functions[fnEntry.key] = {
        args: parseArgs(fnFields.Args),
        returns: parseReturns(fnFields.Returns),
      };
    }
  }

  const enums = {};
  if (publicEntries.Enums?.isBlock) {
    for (const enumEntry of splitTopLevelEntries(publicEntries.Enums.raw)) {
      if (enumEntry.isBlock) continue;
      enums[enumEntry.key] = parseEnumValues(enumEntry.raw);
    }
  }

  return { schema: "public", tables, views, functions, enums };
}

export function loadAndParseSupabaseTypesFile(readFileSyncFn, filePath) {
  const source = readFileSyncFn(filePath, "utf8");
  return parseSupabaseTypes(source);
}
