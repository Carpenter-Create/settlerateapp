import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  highlighted?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic mortgage calculations",
    features: [
      { text: "Basic mortgage calculator", included: true },
      { text: "1 saved scenario (local)", included: true },
      { text: "Amortization schedule", included: true },
      { text: "Cloud sync", included: false },
      { text: "Scenario comparison", included: false },
      { text: "PDF & CSV exports", included: false },
    ],
    cta: "Get started",
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    description: "For serious homebuyers and refinancers",
    features: [
      { text: "Everything in Free", included: true },
      { text: "Unlimited scenarios", included: true },
      { text: "Cloud sync across devices", included: true },
      { text: "Compare up to 4 scenarios", included: true },
      { text: "PDF & CSV exports", included: true },
      { text: "Extra payment modeling", included: true },
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Simple, transparent pricing</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          No hidden fees. No lead selling. Just honest tools.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "card-elevated relative p-8",
              plan.highlighted && "ring-2 ring-primary"
            )}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most popular
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>

              <Button
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full"
                size="lg"
              >
                {plan.cta}
              </Button>

              <div className="space-y-3 pt-4">
                {plan.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 text-sm",
                      !feature.included && "text-muted-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        feature.included
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {feature.included ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="h-px w-2 bg-current" />
                      )}
                    </div>
                    <span className={cn(!feature.included && "line-through")}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          All plans include our commitment to privacy. We never sell your data.
        </p>
      </div>
    </div>
  );
}
