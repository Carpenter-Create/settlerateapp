import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * How It Works Page - Unified Analytical Framework
 * 
 * The intellectual spine of the product. Reads in three layers:
 * 1. Purpose — what this system exists to do
 * 2. Framework — how decisions are evaluated  
 * 3. Methodology — why the outputs are defensible
 */

const frameworkPillars = [
  {
    title: "Scenario modeling",
    body: "Mortgage structures are evaluated under consistent assumptions to enable meaningful comparison across term length, down payment strategy, and time horizon.",
  },
  {
    title: "Normalized assumptions",
    body: "Rates, taxes, insurance, and PMI are standardized across scenarios to prevent distortion and ensure analytical integrity.",
  },
  {
    title: "Cost visibility",
    body: "Long-term interest, capital requirements, and total cost of capital are surfaced explicitly—rather than inferred from monthly payment alone.",
  },
  {
    title: "Professional outputs",
    body: "Exportable summaries designed for advisor discussion, lender review, and documentation—without embedded recommendations or referral bias.",
  },
];

const methodologyPrinciples = [
  {
    title: "Time-horizon analysis",
    body: "Outcomes are evaluated across the full life of the loan, including the point at which principal accumulation overtakes interest.",
  },
  {
    title: "Reproducibility",
    body: "Scenarios can be exported, shared, and independently verified by professionals. Every calculation is documented.",
  },
];

export default function HowItWorks() {
  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          PAGE HERO
          Institutional breathing room. Authority, not marketing.
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary">
        <div className="mx-auto max-w-[1280px] px-6 py-24 lg:px-12 lg:py-36 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-[2.75rem]">
              How mortgage decisions are evaluated
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg">
              A consistent analytical framework designed for clarity, comparability, and professional review.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — THE FRAMEWORK (Primary Body)
          Matches homepage framework section exactly.
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary">
        <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Eyebrow + H2 */}
            <div className="mb-10 lg:mb-12">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
                The SettleRate Framework
              </p>
              <h2 className="mt-4 font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
                Scenario evaluation, standardized
              </h2>
            </div>

            {/* Framework Cards - Matching homepage exactly */}
            <div className="space-y-4">
              {frameworkPillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="group relative border-l-2 border-foreground/10 bg-surface-primary py-7 pl-7 pr-6 transition-all hover:border-foreground/30 sm:py-6 sm:pl-8 sm:pr-8"
                >
                  <h3 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.7] text-foreground/60">
                    {pillar.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — CORE METHODOLOGY (Supporting Layer)
          Single stacked container. Quiet, serious, secondary.
          ══════════════════════════════════════════════════════════════════ */}
      <section id="core-methodology" className="w-full bg-surface-secondary scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-6 pb-16 lg:px-12 lg:pb-24 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Eyebrow + H2 */}
            <div className="mb-8">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
                Core Methodology
              </p>
              <h2 className="mt-4 font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
                Built for verification, not persuasion
              </h2>
            </div>

            {/* Single Stacked Container */}
            <div className="border-l-2 border-foreground/10 bg-surface-primary py-6 pl-7 pr-6 sm:pl-8 sm:pr-8">
              {methodologyPrinciples.map((principle, index) => (
                <div
                  key={principle.title}
                  className={index !== methodologyPrinciples.length - 1 ? "pb-6 mb-6 border-b border-border/50" : ""}
                >
                  <h3 className="text-sm font-medium text-foreground">
                    {principle.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.7] text-foreground/60">
                    {principle.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — BOUNDARY STATEMENT (Regulatory Anchor)
          Closing footnote, not disclaimer dump.
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary">
        <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-12 lg:py-16 xl:px-16">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm leading-[1.8] text-foreground/50">
              SettleRate does not originate, broker, or recommend mortgage products. 
              Outputs are analytical in nature and intended to support independent decision-making.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLOSING CTA
          Minimal. Decision moment.
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary border-t border-border/30">
        <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-20 xl:px-16">
          <div className="mx-auto max-w-xl text-center">
            <Button asChild size="lg" className="min-w-44 h-12 text-base">
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
