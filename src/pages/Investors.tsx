import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Investors Page - Analytical Infrastructure Positioning
 * 
 * Regulated-adjacent, long-term defensibility framing.
 * No startup hype, TAM language, or monetization claims.
 */

export default function Investors() {
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
              Built as analytical infrastructure
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              SettleRate is a neutral decision-support platform designed to improve clarity in mortgage decision-making without participating in transactions.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          THE PROBLEM IS STRUCTURAL
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              The problem is structural
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              Most consumer mortgage tools operate inside incentive-driven ecosystems. This creates structural pressure to optimize for conversion rather than clarity, leaving borrowers without a clear view of long-term outcomes or tradeoffs.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SETTLERATE'S POSITION
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-tertiary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              SettleRate's position
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate operates outside the mortgage incentive chain. It does not originate, broker, recommend, or refer mortgage products, and does not participate in transactions. Its sole function is analytical: to model outcomes using standardized, documented assumptions.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHY THIS MATTERS
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
              Why this matters
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              This separation enables clearer borrower understanding, cleaner professional conversations, and a platform architecture that avoids conflicts inherent in marketplace or lead-generation models.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          DESIGNED WITH REGULATORY DISCIPLINE
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              Designed with regulatory discipline
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate is built to function as decision-support infrastructure rather than financial advice or product distribution. Outputs are illustrative, reproducible, and non-prescriptive, aligning with established regulatory distinctions between tools that inform and entities that transact.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LONG-TERM POSTURE
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
              Long-term posture
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              By prioritizing neutrality, transparency, and restraint, SettleRate is designed for durability in a regulated environment rather than short-term conversion optimization.
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
            <Button asChild size="lg" className="min-w-44 h-12 text-base">
              <Link to="/approach">Learn more</Link>
            </Button>
            <p className="mt-6 text-xs text-foreground/50">
              Institutional positioning. Analytical scope only.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
