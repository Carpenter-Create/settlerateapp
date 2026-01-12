import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * How It Works Page - Canonical Institutional Framing
 * 
 * Feature language uses capability framing, not benefit framing.
 * If a sentence sounds like onboarding copy, it's wrong.
 */

const steps = [
  {
    number: "01",
    title: "Scenario modeling",
    description:
      "Mortgage structures are evaluated under consistent assumptions. Loan parameters, property details, and financing inputs are explicit and documented.",
  },
  {
    number: "02",
    title: "Cost visibility",
    description:
      "Long-term interest, capital requirements, and total cost of capital are surfaced explicitly—rather than inferred from monthly payment alone.",
  },
  {
    number: "03",
    title: "Structural tradeoff analysis",
    description:
      "Down payment strategy, PMI exposure, and term selection are evaluated as interdependent variables under normalized assumptions.",
  },
  {
    number: "04",
    title: "Professional outputs",
    description:
      "Exportable summaries designed for advisor discussion, lender review, and documentation—without embedded recommendations or referral bias.",
  },
];

const principles = [
  {
    title: "Normalized assumptions",
    description:
      "Rates, taxes, insurance, and PMI are standardized across scenarios to prevent distortion and ensure analytical integrity.",
  },
  {
    title: "Time-horizon analysis",
    description:
      "Outcomes are evaluated across the full life of the loan, including the point at which principal accumulation overtakes interest.",
  },
  {
    title: "Reproducibility",
    description:
      "Scenarios can be exported, shared, and independently verified by professionals. Every calculation is documented.",
  },
];

export default function HowItWorks() {
  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Header */}
      <section className="max-w-3xl">
        <h1 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] sm:text-3xl lg:text-4xl">
          How SettleRate works
        </h1>
        <p className="mt-space-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          A structured approach to mortgage scenario evaluation.
        </p>
      </section>

      {/* Steps */}
      <section className="max-w-3xl">
        <div className="space-y-space-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="grid gap-space-4 sm:grid-cols-[auto_1fr] sm:gap-space-6"
            >
              <span className="font-serif text-2xl font-medium tracking-tight text-muted-foreground/50">
                {step.number}
              </span>
              <div className="space-y-space-2">
                <h2 className="text-base font-medium text-foreground">
                  {step.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="max-w-3xl border-t border-border/50 pt-space-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Core methodology
        </h2>
        <div className="mt-space-6 space-y-space-4 text-sm leading-relaxed text-muted-foreground">
          {principles.map((principle) => (
            <p key={principle.title}>
              <strong className="font-medium text-foreground">{principle.title}.</strong>{" "}
              {principle.description}
            </p>
          ))}
        </div>
      </section>

      {/* Independence Statement */}
      <section className="max-w-3xl border-t border-border/50 pt-space-8">
        <p className="text-sm leading-relaxed text-muted-foreground">
          SettleRate does not originate, broker, or recommend mortgage products. Outputs are analytical in nature and intended to support independent decision-making.
        </p>
      </section>

      {/* CTA */}
      <section className="text-center">
        <Button asChild size="lg" className="min-w-40">
          <Link to="/auth">Start free</Link>
        </Button>
        <p className="mt-space-4 text-xs text-muted-foreground">
          No credit card required.
        </p>
      </section>
    </div>
  );
}
