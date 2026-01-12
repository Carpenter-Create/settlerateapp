import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * How It Works Page - Canonical Institutional Framing
 * 
 * Rebuilt to align with Canon v1.1 design system:
 * - Full-width section containers with color-blocking
 * - Consistent max-width and spacing tokens
 * - Clear vertical hierarchy matching homepage and /methodology
 * 
 * This page should feel like a systems explanation written for
 * regulators, advisors, and serious users—not onboarding fluff.
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
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1: Hero / Intro
          Background: Surface Primary
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-5xl">
              How SettleRate works
            </h1>
            <p className="mt-6 text-base leading-[1.7] text-foreground/70 sm:text-lg">
              A structured approach to mortgage scenario evaluation.
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.85] text-foreground/60">
              SettleRate provides a consistent framework for evaluating mortgage structures 
              under standardized assumptions. The platform surfaces long-term cost implications, 
              capital requirements, and structural tradeoffs—producing outputs suitable for 
              professional review without embedded recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2: Four-Step Framework
          Background: Surface Secondary
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary">
        <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Section Label */}
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/40">
              The Framework
            </p>
            
            {/* Steps Grid - Left-rail number system */}
            <div className="mt-10 space-y-10">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="grid grid-cols-[48px_1fr] gap-6 sm:grid-cols-[64px_1fr]"
                >
                  {/* Number - Fixed left rail */}
                  <span className="font-serif text-2xl font-medium tracking-tight text-foreground/20 sm:text-3xl">
                    {step.number}
                  </span>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                      {step.title}
                    </h2>
                    <p className="text-[15px] leading-[1.75] text-foreground/60">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3: Core Methodology
          Background: Surface Primary (inset card on tertiary)
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary">
        <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Section Label */}
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/40">
              Core Methodology
            </p>
            
            {/* Inset Container */}
            <div className="mt-8 rounded-md border border-border-subtle bg-surface-tertiary p-6 sm:p-8">
              <div className="space-y-6">
                {principles.map((principle, index) => (
                  <div 
                    key={principle.title}
                    className={index !== principles.length - 1 ? "pb-6 border-b border-border-subtle" : ""}
                  >
                    <h3 className="text-sm font-medium text-foreground">
                      {principle.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.75] text-foreground/60">
                      {principle.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4: Regulatory Positioning Strip
          Background: Surface Tertiary
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-tertiary">
        <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-12 lg:py-16 xl:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[15px] leading-[1.8] text-foreground/60">
              SettleRate does not originate, broker, or recommend mortgage products. 
              Outputs are analytical in nature and intended to support independent decision-making.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5: Closing CTA
          Background: Surface Secondary
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary">
        <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-20 xl:px-16">
          <div className="mx-auto max-w-xl text-center">
            <Button asChild size="lg" className="min-w-44">
              <Link to="/auth">Start free</Link>
            </Button>
            <p className="mt-4 text-xs text-foreground/50">
              No credit card required.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
