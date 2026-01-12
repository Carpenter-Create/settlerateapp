import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Advisors Page - StoryBrand Structure
 * 
 * Positions SettleRate as preparation, not advice.
 * Emphasizes role clarity and boundary separation.
 * Non-promotional, institutional tone.
 */

const advisorBenefits = [
  "Borrowers arrive with a clearer understanding of assumptions and constraints",
  "Scenarios are framed consistently, reducing rework",
  "Structural tradeoffs are already visible",
  "Conversations begin with outcomes, not just monthly payment figures",
];

export default function Advisors() {
  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          HERO
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
              Built to support professional mortgage conversations
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              SettleRate provides a neutral analytical foundation that helps borrowers arrive informed—before engaging with advisors or lenders.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PROBLEM: Confusion slows conversations
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              When borrowers arrive confused, conversations slow down
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              Many mortgage conversations begin with misaligned expectations—monthly payments optimized without context, assumptions left unstated, and tradeoffs not fully understood. This increases time spent correcting inputs, reframing expectations, and re-explaining fundamentals before meaningful guidance can begin.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          POSITIONING: Not advice. Preparation.
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-tertiary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              SettleRate is not advice. It is preparation.
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate helps borrowers model mortgage scenarios using consistent, documented assumptions before engaging with professionals. The result is not a recommendation, but a clearer starting point—where inputs are understood and tradeoffs are visible.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHAT THIS CHANGES FOR ADVISORS
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              What this changes for advisors
            </h2>
            <ul 
              className="space-y-4"
              style={{ marginTop: '32px' }}
            >
              {advisorBenefits.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 text-[15px] leading-relaxed text-foreground/65"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          DESIGNED FOR PROFESSIONAL REVIEW
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              Designed for professional review
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              Scenario outputs are structured, reproducible, and exportable. They are designed to be reviewed and discussed—without embedded rankings, product bias, or referral logic.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLEAR SEPARATION OF ROLES
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
              Clear separation of roles
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate does not originate, broker, recommend, or refer mortgage products and does not participate in transactions. Advisors remain the source of judgment and guidance.
            </p>
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
              Explore the platform from the borrower's perspective.
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
