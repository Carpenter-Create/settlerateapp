import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useCapabilities } from "@/hooks/useCapabilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, ExternalLink, User, Shield } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  accountAccessConditionLabel,
  accountPlanBadgeVariant,
  accountPlanDescription,
  planLabelFromCode,
} from "@/lib/accountPlanDisplay";

export default function Account() {
  const { user } = useAuth();
  const {
    isPro,
    subscriptionEnd,
    refresh,
    isLoading,
    cancelAtPeriodEnd,
    entitlementStatus,
    planCode,
  } = useSubscription();
  const planLabel = planLabelFromCode(planCode);
  const accessCondition = accountAccessConditionLabel(entitlementStatus);
  const planDescription = accountPlanDescription(planCode, entitlementStatus);
  const { isAdmin, realIsAdmin, isLoading: capabilitiesLoading } = useCapabilities();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingError, setBillingError] = useState<"NO_STRIPE_CUSTOMER" | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Success URL never grants entitlement — refresh from verified billing state
  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      toast("Checkout completed.", {
        description: "Access updates when Stripe confirms your subscription.",
      });
      refresh();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, refresh, setSearchParams]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleManageBilling = async () => {
    if (realIsAdmin) return;

    setBillingError(null);
    setPortalLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/customer-portal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.code === "NO_STRIPE_CUSTOMER") {
        setBillingError("NO_STRIPE_CUSTOMER");
        setPortalLoading(false);
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      console.error("Billing portal error:", error);
      toast("Unable to open billing portal.", { description: "Please try again." });
      setPortalLoading(false);
    }
  };

  // Admin view (not simulating) - no billing UI
  if (isAdmin && !capabilitiesLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          {/* Brand serif for page headings */}
          <h1 className="font-serif text-2xl font-normal tracking-tight">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account information
          </p>
        </div>

        {/* Access level - informational only */}
        <div className="border border-border rounded-sm p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Access Level</p>
              <p className="mt-0.5 font-medium">Professional (Administrator)</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Billing not required for administrator accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Your data */}
        <div className="border border-border rounded-sm p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Your Data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed in as <strong>{user?.email}</strong>
              </p>
              <Button variant="link" asChild className="mt-2 h-auto p-0">
                <Link to="/app/settings">Manage profile and data →</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard user view (or admin simulating as user) - full billing UI
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        {/* Brand serif for page headings */}
        <h1 className="font-serif text-2xl font-normal tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscription and billing management
        </p>
      </div>

      {entitlementStatus === "read_only" && (
        <div className="rounded-sm border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Billing is past due. Existing scenarios remain readable and deletable.
          Creating, editing, comparisons, exports, and shares are paused until
          payment succeeds.
        </div>
      )}

      {entitlementStatus === "trial_entitled" && (
        <div className="rounded-sm border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Professional trial is active
          {subscriptionEnd ? ` through ${formatDate(subscriptionEnd)}` : ""}.
        </div>
      )}

      {/* Plan status */}
      <div className="border border-border rounded-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">Current Plan</h3>
                <Badge variant={accountPlanBadgeVariant(planCode)}>{planLabel}</Badge>
                {accessCondition && (
                  <Badge variant="secondary">{accessCondition}</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{planDescription}</p>

              {planCode === "professional" && subscriptionEnd && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {entitlementStatus === "read_only"
                    ? `Period ends ${formatDate(subscriptionEnd)}`
                    : cancelAtPeriodEnd
                      ? `Access continues through ${formatDate(subscriptionEnd)} (cancellation scheduled)`
                      : entitlementStatus === "trial_entitled"
                        ? `Trial ends ${formatDate(subscriptionEnd)}`
                        : `Renews on ${formatDate(subscriptionEnd)}`}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {/* Inline error messages */}
          {billingError === "NO_STRIPE_CUSTOMER" && (
            <div className="rounded-sm border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                No billing profile found.{" "}
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Subscribe to manage access.
                </button>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {isPro || entitlementStatus === "read_only" ? (
              <Button
                variant="outline"
                className="rounded-sm"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {portalLoading ? "Opening…" : "Manage billing"}
              </Button>
            ) : (
              <Button
                className="rounded-sm"
                onClick={() => setShowUpgradeModal(true)}
              >
                Upgrade to Professional Access
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pro feature preview - only for non-pro users */}
      {!isPro && entitlementStatus !== "read_only" && (
        <div className="border border-dashed border-border rounded-sm p-6">
          <h3 className="font-medium">Professional Access includes</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              Unlimited saved scenarios
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              Saved comparisons
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              Exportable PDF summaries
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              Share and export functionality
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              Income-context framing
            </li>
          </ul>
          <Button
            variant="outline"
            className="mt-6 rounded-sm"
            onClick={() => setShowUpgradeModal(true)}
          >
            View upgrade options
          </Button>
        </div>
      )}

      {/* Your data */}
      <div className="border border-border rounded-sm p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Your Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as <strong>{user?.email}</strong>
            </p>
            <Button variant="link" asChild className="mt-2 h-auto p-0">
              <Link to="/app/settings">Manage profile and data →</Link>
            </Button>
          </div>
        </div>
      </div>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
}
