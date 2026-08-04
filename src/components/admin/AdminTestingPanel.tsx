/**
 * Admin panel note (Phase 6).
 *
 * Client-side entitlement simulation is disabled. Admin bypass is
 * server-verified via user_roles / has_role() and logged on each use.
 */

import { useAdmin } from "@/hooks/useAdmin";
import { useCapabilities } from "@/hooks/useCapabilities";

export function AdminTestingPanel() {
  const { isAdmin, isLoading } = useAdmin();
  const { entitlementStatus, planCode, isAdminBypass } = useCapabilities();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="border border-border rounded-sm p-6">
      <div className="space-y-3">
        <div>
          <h3 className="font-medium">Administrator access</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Entitlement bypass is server-verified via{" "}
            <code className="text-xs">user_roles</code> /{" "}
            <code className="text-xs">has_role()</code>. Browser simulation
            cannot grant or revoke features. Each bypass is logged; billing
            state is not modified.
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Plan code</dt>
            <dd className="font-medium">{planCode}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Entitlement status</dt>
            <dd className="font-medium">{entitlementStatus}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Admin bypass active</dt>
            <dd className="font-medium">{isAdminBypass ? "yes" : "no"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
