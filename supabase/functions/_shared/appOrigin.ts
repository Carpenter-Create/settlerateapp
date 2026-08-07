/**
 * Edge adapter for application-origin allowlist policy.
 *
 * Pure policy: packages/core app-origin (temporary relative bridge).
 * Request header reading stays here — core must not depend on Request/DOM.
 *
 * Deletion condition for the relative bridge: remove when Edge Functions
 * resolve `@settlerate/core/app-origin` via an approved Deno/Supabase import
 * map and CI proves Deno + deploy graph without this path (Epic 5 PR 6).
 * A thin Request adapter may remain indefinitely.
 */

export {
  DEFAULT_APP_ORIGIN,
  resolveAppOriginFromOriginHeader,
} from "../../../packages/core/src/origin/appOrigin.ts";

import { resolveAppOriginFromOriginHeader } from "../../../packages/core/src/origin/appOrigin.ts";

/** Resolve Checkout/Portal return origin from the request Origin header. */
export function resolveAppOrigin(req: Request): string {
  return resolveAppOriginFromOriginHeader(req.headers.get("origin"));
}
