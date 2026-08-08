/**
 * Read applied migration versions from a Supabase project (read-only).
 * Prefers Management API database/query — no CLI link required.
 */
import { spawnSync } from "node:child_process";

/**
 * @param {string} projectRef
 * @param {{ accessToken?: string }} [opts]
 * @returns {Promise<string[]>}
 */
export async function fetchRemoteMigrationVersions(projectRef, opts = {}) {
  const token = opts.accessToken || process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("SUPABASE_ACCESS_TOKEN_missing");
  }

  const sql =
    "select version from supabase_migrations.schema_migrations order by version";
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "SettleRate-Epic9/1.0",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400);
    throw new Error(`remote_migration_query_failed:http_${res.status}:${body}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("remote_migration_query_unexpected_shape");
  }
  return data
    .map((row) => String(row.version ?? "").trim())
    .filter((v) => /^\d{14}$/.test(v))
    .sort();
}

/**
 * Fallback via linked CLI when Management API is unavailable.
 * Requires current `supabase link` to equal projectRef.
 * @param {string} projectRef
 * @returns {string[]}
 */
export function fetchRemoteMigrationVersionsViaLinkedCli(projectRef) {
  const linked = spawnSync("cat", ["supabase/.temp/project-ref"], {
    encoding: "utf8",
  });
  const actual = (linked.stdout || "").trim();
  if (actual !== projectRef) {
    throw new Error(
      `linked_ref_mismatch:got=${actual || "none"}:expected=${projectRef}`,
    );
  }
  const result = spawnSync("supabase", ["migration", "list", "--linked"], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `migration_list_failed:${(result.stderr || result.stdout || "").slice(0, 400)}`,
    );
  }
  const remote = new Set();
  for (const line of (result.stdout || "").split("\n")) {
    if (!/\d{14}/.test(line) || !line.includes("|")) continue;
    const cols = line.split("|").map((c) => c.trim());
    // Local | Remote | Time
    const remoteCol = cols[1] || "";
    const m = remoteCol.match(/\b\d{14}\b/);
    if (m) remote.add(m[0]);
  }
  return [...remote].sort();
}
