import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * How It Works Page - StoryBrand "Plan" Structure
 * 
 * Procedural clarity: what happens when a user uses SettleRate.
 * No marketing, no philosophy—just process.
 */

const steps = [
  {
    number: "01",
    title: "Start with a single scenario",
    body: "You begin by modeling one mortgage scenario using inputs such as purchase price, down payment, interest rate, and term. This establishes a baseline using clearly defined assumptions. No optimization or recommendations are introduced at this stage.",
  },
  {
    number: "02",
    title: "Assumptions are standardized across comparisons",
    body: "When comparing scenarios, SettleRate normalizes shared assumptions—such as property taxes, insurance, PMI, and time horizon—so differences reflect structure, not distortion.",
  },
  {
    number: "03",
    title: "Outcomes are surfaced explicitly",
    body: "Rather than focusing solely on monthly payment, SettleRate surfaces outcomes that are often obscured, including total interest paid, capital required, time to principal dominance, and total cost of capital.",
  },
  {
    number: "04",
    title: "Results are designed for professional review",
    body: "Each scenario produces a structured summary that can be reviewed independently or exported for discussion with advisors, lenders, or other professionals. Outputs are descriptive, not prescriptive.",
  },
];

const constraints = [
  "We do not originate, broker, or refer mortgage products.",
  "We do not provide personalized financial, legal, or tax advice.",
  "We do not sell user data or generate revenue from lender referrals.",
  "We do not use incentive-driven defaults or promotional inputs.",
];

export default function HowItWorks() {
  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          HERO
          Clear procedural framing. No philosophy.
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
              How SettleRate works
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              A structured, neutral process for modeling mortgage outcomes using consistent assumptions.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ANALYTICAL SEQUENCE (Steps)
          Procedural steps with numbered progression.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 lg:mb-12">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
                Process
              </p>
              <h2 
                className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
                style={{ marginTop: 'var(--space-text-stack)' }}
              >
                A simple analytical sequence
              </h2>
            </div>

            {/* Step Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-card-gap)' }}>
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="group relative border-l-2 border-foreground/10 bg-surface-primary transition-all hover:border-foreground/30"
                  style={{ padding: '32px' }}
                >
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-medium text-foreground/40">
                      {step.number}
                    </span>
                    <h3 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p 
                    className="text-[15px] leading-[1.7] text-foreground/60 ml-8"
                    style={{ marginTop: 'var(--space-text-stack)' }}
                  >
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHAT THIS ENABLES
          Single transition statement.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-tertiary"
        style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
              What this approach enables
            </h2>
            <p 
              className="text-[15px] leading-[1.7] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              By using consistent assumptions and outcome-focused metrics, SettleRate helps conversations start from clarity rather than confusion.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SCOPE — What SettleRate does not do
          Single appearance. No duplication.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              Scope
            </p>
            <h2 
              className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              What SettleRate does not do
            </h2>
            <ul className="mt-8 space-y-4">
              {constraints.map((constraint, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 text-[15px] leading-relaxed text-foreground/65"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                  <span>{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLOSING CTA
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <p className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
              Begin with a single scenario.
            </p>
            <Button asChild size="lg" className="mt-8 min-w-44 h-12 text-base">
              <Link to="/auth">Begin analysis</Link>
            </Button>
            <p className="mt-6 text-xs text-foreground/50">
              Analytical access. No product promotion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
