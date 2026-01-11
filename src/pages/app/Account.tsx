import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBilling, isPro } from "@/hooks/useBilling";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, ExternalLink, User } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useState } from "react";

export default function Account() {
  const { user } = useAuth();
  const { data: billing, isLoading } = useBilling();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const userIsPro = isPro(billing);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and billing
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
                <Badge variant={userIsPro ? "default" : "secondary"}>
                  {userIsPro ? "Pro" : "Free"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {userIsPro
                  ? "Full access to all features including exports and unlimited scenarios."
                  : "Basic access. Upgrade to unlock all features."}
              </p>

              {userIsPro && billing?.current_period_end && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Renews on {formatDate(billing.current_period_end)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {userIsPro ? (
            <Button variant="outline" asChild>
              <a
                href={`https://billing.stripe.com/p/login/test_xxx`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage billing
              </a>
            </Button>
          ) : (
            <Button onClick={() => setShowUpgradeModal(true)}>
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>

      {/* Pro feature preview */}
      {!userIsPro && (
        <div className="card-elevated border-dashed p-6">
          <h3 className="font-medium">Pro Features</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Unlimited mortgage scenarios
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Cloud sync across devices
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Lender-ready PDF exports
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Side-by-side comparison tools
            </li>
          </ul>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setShowUpgradeModal(true)}
          >
            View pricing
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

      {/* Debug panel (dev only) */}
      {import.meta.env.DEV && billing && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Debug: Billing row
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-3">
            {JSON.stringify(billing, null, 2)}
          </pre>
        </details>
      )}

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
}
