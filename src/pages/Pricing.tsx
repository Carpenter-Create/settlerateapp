import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const freeFeatures = [
  "Create one scenario",
  "Basic payment breakdown",
  "No exports",
];

const proFeatures = [
  "Unlimited scenarios",
  "Side-by-side comparison",
  "ZIP-based tax and insurance estimates",
  "Lender-ready PDF exports",
  "Rate-change narratives",
  "Income context framing",
  "Priority support",
];

type BillingInterval = "annual" | "monthly";

const pricing = {
  annual: {
    price: "$79",
    period: "/year",
    subtext: "Billed annually",
  },
  monthly: {
    price: "$9",
    period: "/month",
    subtext: "Billed monthly",
  },
};

export default function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const currentPricing = pricing[interval];

  return (
    <div className="mx-auto max-w-3xl space-y-space-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-space-4 text-base text-muted-foreground">
          Transparent pricing. No hidden fees.
        </p>
      </div>

      {/* Plans */}
      <div className="grid gap-space-6 sm:grid-cols-2">
        {/* Free Plan */}
        <div className="flex flex-col rounded-sm border border-border bg-card p-space-6">
          <div className="space-y-1">
            <h3 className="text-base font-medium">Free</h3>
            <p className="text-sm text-muted-foreground">
              Core mortgage analysis
            </p>
          </div>

          <div className="mt-space-5 flex items-baseline gap-1">
            <span className="font-serif text-4xl">$0</span>
          </div>

          <ul className="mt-space-6 flex-1 space-y-space-3">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-space-3 text-sm">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <p className="mt-space-6 text-center text-sm text-muted-foreground">
            Available to all users
          </p>
        </div>

        {/* Pro Plan */}
        <div className="flex flex-col rounded-sm border border-border bg-card p-space-6">
          <div className="space-y-1">
            <h3 className="text-base font-medium">Pro</h3>
            <p className="text-sm text-muted-foreground">
              Complete decision workspace
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="mt-space-5 flex gap-1 rounded-sm border border-border p-1">
            <button
              onClick={() => setInterval("annual")}
              className={cn(
                "flex-1 rounded-sm px-3 py-2 text-xs font-medium transition-colors",
                interval === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
            </button>
            <button
              onClick={() => setInterval("monthly")}
              className={cn(
                "flex-1 rounded-sm px-3 py-2 text-xs font-medium transition-colors",
                interval === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
          </div>

          <div className="mt-space-4 space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-4xl">{currentPricing.price}</span>
              <span className="text-sm text-muted-foreground">
                {currentPricing.period}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentPricing.subtext}
            </p>
          </div>

          <ul className="mt-space-6 flex-1 space-y-space-3">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-space-3 text-sm">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button asChild className="mt-space-6 w-full" size="lg">
            <Link to="/auth">Start free</Link>
          </Button>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground/70">
        Your data remains private. We never sell leads or personal information.
      </p>
    </div>
  );
}
