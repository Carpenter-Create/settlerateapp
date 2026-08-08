/**
 * Fixed SettleRate environment project refs (ADR 0014).
 * Never accept arbitrary workflow input as a mutation target.
 */
export const STAGING_SUPABASE_REF = "gkhbalfpxjtleypbabjo";
export const PRODUCTION_SUPABASE_REF = "vpcxzbaxhpucvevnkalo";
export const STAGING_VERCEL_PROJECT = "settlerate-app-staging";
export const STAGING_VERCEL_PROJECT_ID = "prj_GMmcFJmTAQnpXRtwux8VqUzM6wGo";

/**
 * @param {string | null | undefined} actual
 * @param {string} expected
 * @param {string} label
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertProjectRef(actual, expected, label = "project_ref") {
  const value = (actual ?? "").trim();
  if (!value) {
    return { ok: false, reason: `${label}_missing` };
  }
  if (value !== expected) {
    return { ok: false, reason: `${label}_mismatch:got=${value}:expected=${expected}` };
  }
  return { ok: true };
}

/**
 * Refuse if a staging tool is pointed at production (or vice versa).
 * @param {"staging" | "production"} role
 * @param {string | null | undefined} actual
 */
export function assertRoleProjectRef(role, actual) {
  if (role === "staging") {
    const hitProd = assertProjectRef(actual, PRODUCTION_SUPABASE_REF, "project_ref");
    if (hitProd.ok) {
      return { ok: false, reason: "staging_tool_targeted_production" };
    }
    return assertProjectRef(actual, STAGING_SUPABASE_REF, "staging_project_ref");
  }
  if (role === "production") {
    const hitStaging = assertProjectRef(actual, STAGING_SUPABASE_REF, "project_ref");
    if (hitStaging.ok) {
      return { ok: false, reason: "production_tool_targeted_staging" };
    }
    return assertProjectRef(actual, PRODUCTION_SUPABASE_REF, "production_project_ref");
  }
  return { ok: false, reason: `unknown_role:${role}` };
}
