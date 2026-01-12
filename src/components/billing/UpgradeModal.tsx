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
import { useQueryClient } from "@tanstack/react-query";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  "Unlimited mortgage scenarios",
  "Cloud sync across devices",
  "Lender-ready PDF exports",
  "Side-by-side comparisons",
  "Priority support",
];

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { user, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const monthlyPrice = 9;
  const annualPrice = 79;
  const displayPrice = isAnnual ? annualPrice : monthlyPrice;
  const period = isAnnual ? "year" : "month";
  const savings = isAnnual ? Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100) : 0;

  const handleSubscribe = async () => {
    // Block anonymous users - require sign-in first
    if (!user || isAnonymous) {
      onOpenChange(false);
      navigate("/auth", { state: { from: { pathname: "/app/calculator" } } });
      toast.info("Sign in to subscribe", {
        description: "Create an account to access Pro features.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the create-subscription edge function
      const response = await fetch(
        `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/create-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            priceType: isAnnual ? "annual" : "monthly",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create subscription");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      toast.error("Failed to start subscription", { description: error.message });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Upgrade to Pro</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sign-in prompt for anonymous users */}
          {isAnonymous && (
            <div className="rounded-md border border-border bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to subscribe and keep your scenarios.
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
              {savings > 0 && (
                <span className="ml-1 text-xs text-primary">Save {savings}%</span>
              )}
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
                Billed annually (${Math.round(annualPrice / 12)}/mo)
              </p>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
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
                Setting up...
              </>
            ) : isAnonymous ? (
              "Sign in to subscribe"
            ) : (
              "Subscribe"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Cancel anytime. Secure payment via Stripe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
