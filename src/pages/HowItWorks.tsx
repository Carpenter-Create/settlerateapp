import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * How It Works Page - Consolidated Analytical System
 * 
 * This page presents SettleRate as a single, coherent analytical system
 * combining procedural explanation with methodological foundation.
 * Structured for regulators, advisors, and serious users.
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

const methodologySections = [
  {
    number: "01",
    title: "Standardized assumptions",
    description:
      "All scenarios are evaluated using normalized assumptions to prevent distortion across comparisons. Property taxes, insurance, and PMI treatment are applied consistently. Rate environments are normalized to isolate structural differences.",
    rationale: "Standardization ensures differences in outcomes reflect structure, not presentation.",
  },
  {
    number: "02",
    title: "Scenario construction",
    description:
      "Scenarios represent discrete mortgage structures rather than provider-specific offers. Term length, down payment, and PMI exposure are treated as structural variables. No lender-specific incentives or adjustments are applied.",
    rationale: "Structural comparison prevents bias introduced by sales-driven inputs.",
  },
  {
    number: "03",
    title: "Modeled outputs",
    description:
      "SettleRate surfaces decision-grade outcomes: monthly obligations, total interest over the loan life, cash required at close, time horizon at which principal accumulation exceeds interest, and total cost of capital.",
    rationale: "Long-term cost and capital requirements are central to mortgage decisions and are often underrepresented.",
  },
  {
    number: "04",
    title: "Interpretation boundaries",
    description:
      "Outputs reflect modeled outcomes under stated assumptions. Results do not predict future rates, approval, or loan terms. Users retain full responsibility for decisions and outcomes.",
  },
  {
    number: "05",
    title: "Independence",
    description:
      "SettleRate operates independently of lenders and originators. No referral fees, no lender compensation, no ranking or promotion of providers.",
    rationale: "Independence preserves analytical integrity.",
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
              SettleRate evaluates mortgage scenarios using standardized assumptions and 
              consistent modeling to enable meaningful comparison across loan structures. 
              The methodology prioritizes transparency, repeatability, and clarity over 
              optimization or recommendation.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2: The SettleRate Framework
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
          Background: Surface Primary
          Same layout system as The Framework section
          ══════════════════════════════════════════════════════════════════ */}
      <section id="core-methodology" className="w-full bg-surface-primary scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Section Label */}
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/40">
              Core Methodology
            </p>
            
            {/* Methodology Grid - Same left-rail number system */}
            <div className="mt-10 space-y-10">
              {methodologySections.map((section) => (
                <div
                  key={section.number}
                  className="grid grid-cols-[48px_1fr] gap-6 sm:grid-cols-[64px_1fr]"
                >
                  {/* Number - Fixed left rail */}
                  <span className="font-serif text-2xl font-medium tracking-tight text-foreground/20 sm:text-3xl">
                    {section.number}
                  </span>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                      {section.title}
                    </h2>
                    <p className="text-[15px] leading-[1.75] text-foreground/60">
                      {section.description}
                    </p>
                    {section.rationale && (
                      <p className="text-sm italic text-foreground/40 pt-1">
                        {section.rationale}
                      </p>
                    )}
                  </div>
                </div>
              ))}
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
              SettleRate provides analytical modeling only and does not originate, broker, 
              or recommend mortgage products, nor provide financial, legal, or tax advice.
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
