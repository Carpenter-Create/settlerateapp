/**
 * Edge adapter for application-origin allowlist policy.
 *
 * Pure policy: `@settlerate/core/app-origin` (via Edge deno.json).
 * Request header reading stays here — core must not depend on Request/DOM.
 */

export {
  DEFAULT_APP_ORIGIN,
  resolveAppOriginFromOriginHeader,
} from "@settlerate/core/app-origin";

import { resolveAppOriginFromOriginHeader } from "@settlerate/core/app-origin";

/** Resolve Checkout/Portal return origin from the request Origin header. */
export function resolveAppOrigin(req: Request): string {
  return resolveAppOriginFromOriginHeader(req.headers.get("origin"));
}
