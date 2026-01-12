import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PRICING } from "@/lib/stripe";

/**
 * Pricing Page - Subscription Access
 * 
 * Two tiers only: Analytical Access (Free) and Professional Access (Pro).
 * No trials, no discounts, no promotional copy.
 */

const analyticalFeatures = [
  "Create and evaluate mortgage scenarios",
  "Compare structural variables (rate, term, down payment)",
  "View modeled outcomes across the loan horizon",
];

const professionalFeatures = [
  "Unlimited scenario modeling",
  "Saved scenarios and revisions",
  "Exportable PDF summaries",
  "Advisor- and lender-ready outputs",
  "Income-context framing (percent-of-income views)",
];

export default function Pricing() {
  const { user, isAnonymous } = useAuth();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const displayPrice = isAnnual ? PRICING.pro.annual.display : PRICING.pro.monthly.display;
  const period = isAnnual ? "year" : "month";

  const handleUpgrade = async () => {
    // If not logged in or anonymous, redirect to auth
    if (!user || isAnonymous) {
      navigate("/auth", { state: { from: { pathname: "/pricing" }, upgrade: true } });
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
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      toast("Unable to process request.", { description: "Please try again." });
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ 
          paddingTop: 'var(--space-hero-top)', 
          paddingBottom: 'var(--space-hero-bottom)' 
        }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-[2.75rem]">
              Subscription access
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              SettleRate is offered on a subscription basis to maintain independence from lending, brokerage, and referral incentives. Fees are not contingent on loan outcomes, selections, or transactions.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PRICING TIERS
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Tiers Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Tier 1: Analytical Access (Free) */}
              <div className="flex flex-col border-l-2 border-foreground/10 bg-surface-primary p-8">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-lg font-medium text-foreground">
                    Analytical Access
                  </h3>
                  <span className="text-2xl font-semibold text-foreground">Free</span>
                </div>
                <p 
                  className="text-sm leading-relaxed text-foreground/60"
                  style={{ marginTop: 'var(--space-text-stack)' }}
                >
                  Access to core mortgage modeling under standardized assumptions.
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {analyticalFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-foreground/30"
                        strokeWidth={1.5}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild variant="outline" className="mt-8 w-full" size="lg">
                  <Link to="/app/calculator">Begin analysis</Link>
                </Button>
              </div>

              {/* Tier 2: Professional Access (Pro) */}
              <div className="flex flex-col border-l-2 border-foreground/10 bg-surface-primary p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-serif text-lg font-medium text-foreground">
                    Professional Access
                  </h3>
                </div>

                {/* Billing toggle */}
                <div className="mt-4 flex items-center gap-3">
                  <Label
                    htmlFor="billing-toggle"
                    className={`text-sm ${!isAnnual ? "font-medium text-foreground" : "text-foreground/50"}`}
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
                    className={`text-sm ${isAnnual ? "font-medium text-foreground" : "text-foreground/50"}`}
                  >
                    Annual
                  </Label>
                </div>

                {/* Price display */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-foreground">${displayPrice}</span>
                  <span className="text-foreground/60">/{period}</span>
                </div>
                {isAnnual && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Billed annually
                  </p>
                )}

                <p 
                  className="text-sm leading-relaxed text-foreground/60"
                  style={{ marginTop: 'var(--space-text-stack)' }}
                >
                  Extended access designed for documentation, comparison, and decision clarity.
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {professionalFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-foreground/30"
                        strokeWidth={1.5}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isPro ? (
                  <Button variant="outline" className="mt-8 w-full" size="lg" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button 
                    className="mt-8 w-full" 
                    size="lg" 
                    onClick={handleUpgrade}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing…" : "Upgrade to Professional Access"}
                  </Button>
                )}
              </div>
            </div>

            {/* Footnote */}
            <p className="mt-6 text-center text-xs text-foreground/50">
              No lender affiliation. No referral incentives. Outputs are neutral and portable.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SCOPE AND LIMITATIONS
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
              Scope and limitations
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate provides analytical modeling only. It does not originate, broker, recommend, or refer mortgage products, and does not provide financial, legal, or tax advice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
