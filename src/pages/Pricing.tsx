import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Core mortgage analysis tools",
    features: [
      "Mortgage calculator with full amortization",
      "Single scenario, stored locally",
      "Tax and insurance modeling",
    ],
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "Complete decision workspace",
    features: [
      "Everything in Free",
      "Unlimited saved scenarios",
      "Side-by-side comparison (up to 4)",
      "Cloud sync across devices",
      "PDF and CSV exports",
      "Extra payment modeling",
    ],
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-3xl space-y-16">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          No hidden fees. No lead selling. Just honest tools.
        </p>
      </div>

      {/* Plans */}
      <div className="grid gap-8 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="flex flex-col rounded-sm border border-border bg-card p-8"
          >
            <div className="space-y-1">
              <h3 className="text-base font-medium">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-serif text-4xl">{plan.price}</span>
              {plan.period && (
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              )}
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {plan.highlighted ? (
              <Button asChild className="mt-8 w-full" size="lg">
                <Link to="/auth">Start free</Link>
              </Button>
            ) : (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Available to all users
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground/70">
        We never sell your data. Your scenarios remain private.
      </p>
    </div>
  );
}
