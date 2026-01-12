import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Define your scenario",
    description:
      "Enter loan parameters, property details, and financing assumptions. All inputs are explicit and documented.",
  },
  {
    number: "02",
    title: "Review structured outputs",
    description:
      "See monthly payments, amortization schedules, and total cost breakdowns based on your inputs—not optimized defaults.",
  },
  {
    number: "03",
    title: "Compare alternatives",
    description:
      "Model multiple loan structures side by side with normalized assumptions to surface meaningful differences.",
  },
  {
    number: "04",
    title: "Export for review",
    description:
      "Generate professional documentation suitable for underwriting conversations, advisor review, or personal records.",
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
          A structured approach to mortgage scenario modeling.
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
          Core principles
        </h2>
        <div className="mt-space-6 space-y-space-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Transparency.</strong>{" "}
            Every calculation uses documented assumptions. No hidden optimizations or promotional defaults.
          </p>
          <p>
            <strong className="font-medium text-foreground">Neutrality.</strong>{" "}
            We have no financial relationship with lenders. Our outputs are not influenced by transaction incentives.
          </p>
          <p>
            <strong className="font-medium text-foreground">Reproducibility.</strong>{" "}
            Scenarios can be exported, shared, and independently verified by professionals.
          </p>
        </div>
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
