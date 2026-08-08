/**
 * Pure helpers for staging-verified commit status acceptance (ADR 0014).
 */

/**
 * @param {{
 *   context?: string,
 *   state?: string,
 *   creator?: { login?: string } | null,
 *   target_url?: string | null,
 * } | null | undefined} status
 * @returns {{ ok: boolean, reason?: string }}
 */
export function isTrustedStagingVerifiedSuccess(status) {
  if (!status) return { ok: false, reason: "missing_status" };
  if (status.context !== "staging-verified") {
    return { ok: false, reason: "wrong_context" };
  }
  if (status.state !== "success") {
    return { ok: false, reason: `state_${status.state || "unknown"}` };
  }
  const creator = status.creator?.login || "";
  if (creator !== "github-actions[bot]") {
    return { ok: false, reason: `untrusted_creator:${creator || "none"}` };
  }
  const target = status.target_url || "";
  if (!/\/actions\/runs\/\d+/.test(target)) {
    return { ok: false, reason: "missing_actions_run_url" };
  }
  return { ok: true };
}
