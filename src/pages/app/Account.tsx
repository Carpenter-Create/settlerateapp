import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, ExternalLink, User, CheckCircle } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Account() {
  const { user } = useAuth();
  const { isPro, subscriptionEnd, refresh, isLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle subscription success redirect
  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      toast("Subscription activated.", {
        description: "Professional Access is now enabled.",
      });
      refresh();
      // Clear the query param
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to open billing portal");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      toast("Unable to open billing portal.", { description: "Please try again." });
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscription and billing management
        </p>
      </div>

      {/* Plan status */}
      <div className="card-elevated p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Current Plan</h3>
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Professional" : "Analytical"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPro
                  ? "Full access including exports, saved scenarios, and income-context views."
                  : "Core mortgage modeling. Upgrade for extended features."}
              </p>

              {isPro && subscriptionEnd && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Renews on {formatDate(subscriptionEnd)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isPro ? (
            <Button 
              variant="outline" 
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {portalLoading ? "Opening…" : "Manage billing"}
            </Button>
          ) : (
            <Button onClick={() => setShowUpgradeModal(true)}>
              Upgrade to Professional Access
            </Button>
          )}
        </div>
      </div>

      {/* Pro feature preview */}
      {!isPro && (
        <div className="card-elevated border-dashed p-6">
          <h3 className="font-medium">Professional Access includes</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Unlimited scenario modeling
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Saved scenarios and revisions
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Exportable PDF summaries
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Advisor- and lender-ready outputs
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Income-context framing
            </li>
          </ul>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setShowUpgradeModal(true)}
          >
            View upgrade options
          </Button>
        </div>
      )}

      {/* Your data */}
      <div className="card-elevated p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
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
