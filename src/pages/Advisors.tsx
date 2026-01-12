import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Advisors Page - Canonical Institutional Framing
 * 
 * Non-consumer, non-advisory copy standard.
 * Spacing tokenized via CSS custom properties.
 * Matches /how-it-works design system.
 */

const useCases = [
  {
    title: "Scenario evaluation",
    body: "Model multiple mortgage structures under consistent assumptions to surface long-term cost, capital requirements, and time-horizon implications.",
  },
  {
    title: "Contextual discussion",
    body: "Use structured outputs to frame client conversations around tradeoffs rather than rates or monthly payment alone.",
  },
  {
    title: "Documentation",
    body: "Generate exportable summaries suitable for internal review, lender discussion, or client records.",
  },
];

const provides = [
  "Analytical modeling based on standardized assumptions",
  "Structural comparison across loan scenarios",
  "Documented, reproducible outputs",
];

const doesNot = [
  "Recommend mortgage products or providers",
  "Rank or promote loan options",
  "Provide financial, legal, or tax advice",
  "Participate in origination or referral workflows",
];

export default function Advisors() {
  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          PAGE HERO
          Uses spacing tokens. Institutional authority.
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
              Independent mortgage analysis for professional context
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              A neutral framework for evaluating mortgage structures using standardized assumptions and decision-grade outputs.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: PURPOSE
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              Purpose
            </p>
            <h2 
              className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Designed for clarity, not conversion
            </h2>
            <p 
              className="text-[15px] leading-[1.85] text-foreground/60"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate provides analytical modeling to support mortgage-related discussions where precision and transparency matter. The platform operates independently of origination, brokerage, and referral incentives, enabling advisors to evaluate structural tradeoffs without embedded product bias.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: PROFESSIONAL USE CASES
          Matches /how-it-works card system.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              How advisors use SettleRate
            </p>
            <h2 
              className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Professional use cases
            </h2>

            {/* Use Case Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-card-gap)', marginTop: '40px' }}>
              {useCases.map((useCase) => (
                <article
                  key={useCase.title}
                  className="group relative border-l-2 border-foreground/10 bg-surface-secondary transition-all hover:border-foreground/30"
                  style={{ padding: '32px' }}
                >
                  <h3 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                    {useCase.title}
                  </h3>
                  <p 
                    className="text-[15px] leading-[1.7] text-foreground/60"
                    style={{ marginTop: 'var(--space-text-stack)' }}
                  >
                    {useCase.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: DEFINED BOUNDARIES
          Visually restrained and unmistakable.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              What SettleRate does—and does not do
            </p>
            <h2 
              className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Defined boundaries
            </h2>

            <div 
              className="grid gap-8 sm:grid-cols-2"
              style={{ marginTop: '40px' }}
            >
              {/* Provides */}
              <div>
                <p className="text-sm font-medium text-foreground mb-4">SettleRate provides:</p>
                <ul className="space-y-3">
                  {provides.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Does Not */}
              <div>
                <p className="text-sm font-medium text-foreground mb-4">SettleRate does not:</p>
                <ul className="space-y-3">
                  {doesNot.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: DECISION-GRADE OUTPUTS
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section-tight)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              Outputs and interpretation
            </p>
            <h2 
              className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Decision-grade outputs
            </h2>
            <p 
              className="text-[15px] leading-[1.85] text-foreground/60"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate surfaces modeled outcomes including total interest paid, cash required at close, and principal-to-interest dynamics over time. Outputs are illustrative and reflect stated assumptions rather than predictions or guarantees.
            </p>
            <p 
              className="text-[15px] leading-[1.85] text-foreground/60"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Advisors retain discretion regarding interpretation and use within their professional practice.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: INDEPENDENCE
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              Independence and incentives
            </p>
            <h2 
              className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Neutral by design
            </h2>
            <p 
              className="text-[15px] leading-[1.85] text-foreground/60"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate does not receive compensation from lenders or third parties based on user activity, selections, or loan outcomes. The platform's business model is not tied to transaction volume, approvals, or referrals.
            </p>
            <p 
              className="text-[15px] leading-[1.85] text-foreground/60"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              This independence preserves analytical integrity and reduces conflicts of interest.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          BOUNDARY STATEMENT
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm leading-[1.8] text-foreground/50">
              SettleRate is an analytical platform. It does not originate, broker, or recommend mortgage products, and does not assume responsibility for decisions made using its outputs.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLOSING CTA
          Quiet, professional.
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary border-t border-border/30">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <Button asChild size="lg" className="min-w-44 h-12 text-base">
              <Link to="/auth">Access the platform</Link>
            </Button>
            <p className="mt-4 text-xs text-foreground/50">
              Analytical access. No product promotion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
