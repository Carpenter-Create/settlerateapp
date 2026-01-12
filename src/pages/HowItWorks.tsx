import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * How It Works Page - Unified Analytical Framework
 * 
 * The intellectual spine of the product. Reads in three layers:
 * 1. Purpose — what this system exists to do
 * 2. Framework — how decisions are evaluated  
 * 3. Methodology — why the outputs are defensible
 * 
 * Copy is non-consumer, non-promotional, defensible.
 * Spacing is tokenized via CSS custom properties.
 */

const frameworkPillars = [
  {
    title: "Scenario modeling",
    body: "Mortgage structures are evaluated under consistent, documented assumptions to enable direct comparison across term length, down payment strategy, and time horizon.",
  },
  {
    title: "Normalized assumptions",
    body: "Rates, taxes, insurance, and PMI are standardized across scenarios to prevent distortion and preserve analytical integrity.",
  },
  {
    title: "Cost visibility",
    body: "Long-term interest, capital requirements, and total cost of capital are surfaced explicitly rather than inferred from monthly payment figures.",
  },
  {
    title: "Professional outputs",
    body: "Structured summaries designed for advisor discussion, lender review, and documentation—without embedded recommendations, rankings, or referral bias.",
  },
];

const methodologyPrinciples = [
  {
    title: "Time-horizon analysis",
    body: "Outcomes are evaluated across the full life of the loan, including the point at which cumulative principal repayment exceeds cumulative interest.",
  },
  {
    title: "Reproducibility",
    body: "Scenarios can be exported, shared, and independently verified. All calculations are documented and traceable to stated inputs.",
  },
];

export default function HowItWorks() {
  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          PAGE HERO
          Uses --space-hero-top / --space-hero-bottom tokens.
          Institutional breathing room. Authority, not marketing.
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
              How mortgage decisions are evaluated
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              A consistent analytical framework designed for clarity, comparability, and professional review.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — THE FRAMEWORK (Primary Body)
          Uses --space-section for vertical rhythm.
          Matches homepage framework section exactly.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Eyebrow + H2 */}
            <div className="mb-10 lg:mb-12">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
                The SettleRate Framework
              </p>
              <h2 
                className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
                style={{ marginTop: 'var(--space-text-stack)' }}
              >
                Scenario evaluation, standardized
              </h2>
            </div>

            {/* Framework Cards - Card gap tokenized */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-card-gap)' }}>
              {frameworkPillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="group relative border-l-2 border-foreground/10 bg-surface-primary transition-all hover:border-foreground/30"
                  style={{ padding: '32px' }}
                >
                  <h3 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                    {pillar.title}
                  </h3>
                  <p 
                    className="text-[15px] leading-[1.7] text-foreground/60"
                    style={{ marginTop: 'var(--space-text-stack)' }}
                  >
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
          Uses --space-section-tight for top margin from prior section.
          Single stacked container. Quiet, serious, secondary.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        id="core-methodology" 
        className="w-full bg-surface-secondary scroll-mt-20"
        style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Eyebrow + H2 */}
            <div className="mb-8">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
                Core Methodology
              </p>
              <h2 
                className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl"
                style={{ marginTop: 'var(--space-text-stack)' }}
              >
                Built for verification, not persuasion
              </h2>
            </div>

            {/* Single Stacked Container */}
            <div 
              className="border-l-2 border-foreground/10 bg-surface-primary"
              style={{ padding: '32px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-card-gap)' }}>
                {methodologyPrinciples.map((principle, index) => (
                  <div
                    key={principle.title}
                    className={index !== methodologyPrinciples.length - 1 ? "pb-6 border-b border-border/50" : ""}
                  >
                    <h3 className="text-sm font-medium text-foreground">
                      {principle.title}
                    </h3>
                    <p 
                      className="text-[15px] leading-[1.7] text-foreground/60"
                      style={{ marginTop: 'var(--space-text-stack)' }}
                    >
                      {principle.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — BOUNDARY STATEMENT (Regulatory Anchor)
          Closing footnote, not disclaimer dump.
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm leading-[1.8] text-foreground/50">
              SettleRate does not originate, broker, or recommend mortgage products. 
              Outputs are analytical in nature and intended to support independent evaluation by users and their professional advisors.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLOSING CTA
          Minimal. Decision moment.
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary border-t border-border/30">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
        >
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
