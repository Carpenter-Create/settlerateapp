import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PRICING } from "@/lib/stripe";

/**
 * Upgrade Modal - Institutional, Administrative
 * No emotional or consumer language.
 */

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  "Unlimited scenario modeling",
  "Saved scenarios and revisions",
  "Exportable PDF summaries",
  "Advisor- and lender-ready outputs",
  "Income-context framing (percent-of-income views)",
];

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { user, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const displayPrice = isAnnual ? PRICING.pro.annual.display : PRICING.pro.monthly.display;
  const period = isAnnual ? "year" : "month";

  const handleSubscribe = async () => {
    // Block anonymous users - require sign-in first
    if (!user || isAnonymous) {
      onOpenChange(false);
      navigate("/auth", { state: { from: { pathname: "/app/calculator" } } });
      toast("Sign-in required.", {
        description: "Create an account to access Professional features.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            priceType: isAnnual ? "annual" : "monthly",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Subscription request failed");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch {
      toast("Unable to process request.", { description: "Please try again." });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Professional Access</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sign-in prompt for anonymous users */}
          {isAnonymous && (
            <div className="rounded-md border border-border bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to subscribe and retain scenarios.
              </p>
            </div>
          )}

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <Label
              htmlFor="billing-toggle"
              className={!isAnnual ? "font-medium" : "text-muted-foreground"}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label
              htmlFor="billing-toggle"
              className={isAnnual ? "font-medium" : "text-muted-foreground"}
            >
              Annual
            </Label>
          </div>

          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-semibold">${displayPrice}</span>
              <span className="text-muted-foreground">/{period}</span>
            </div>
            {isAnnual && (
              <p className="mt-1 text-sm text-muted-foreground">
                Billed annually
              </p>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 shrink-0 text-foreground/40" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Subscribe button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : isAnonymous ? (
              "Sign in to subscribe"
            ) : (
              "Upgrade to Professional Access"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Secure payment via Stripe. No lender affiliation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
