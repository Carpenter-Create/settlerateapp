/**
 * Methodology Page - Technical, Dry, Defensible
 * 
 * This page explains how SettleRate models outcomes without selling,
 * persuading, or oversimplifying. Reads like a technical memo—clear,
 * restrained, and boring in the right way.
 */

export default function Methodology() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full bg-surface-primary">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-5xl">
              Methodology
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-12 lg:py-24">
          {/* Introduction */}
          <p className="text-base leading-[1.85] text-foreground/70">
            SettleRate evaluates mortgage scenarios using standardized assumptions and 
            consistent modeling to enable meaningful comparison across loan structures. 
            The methodology prioritizes transparency, repeatability, and clarity over 
            optimization or recommendation. Outputs are analytical in nature and intended 
            to support independent decision-making and professional review.
          </p>

          {/* Section 1: Standardized Assumptions */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Standardized Assumptions
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              All scenarios are evaluated using normalized assumptions to prevent distortion across comparisons.
            </p>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Property taxes and insurance are standardized across scenarios.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                PMI treatment is applied consistently based on down payment thresholds.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Rate environments are normalized to isolate structural differences.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Assumptions are disclosed alongside outputs.
              </li>
            </ul>
            <p className="text-sm italic text-foreground/50 mt-4">
              Rationale: Standardization ensures differences in outcomes reflect structure, not presentation.
            </p>
          </div>

          {/* Section 2: Scenario Construction */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Scenario Construction
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              Scenarios represent discrete mortgage structures rather than provider-specific offers.
            </p>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Term length, down payment, and PMI exposure are treated as structural variables.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Scenarios are evaluated independently but compared under identical assumptions.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                No lender-specific incentives or adjustments are applied.
              </li>
            </ul>
            <p className="text-sm italic text-foreground/50 mt-4">
              Rationale: Structural comparison prevents bias introduced by sales-driven inputs.
            </p>
          </div>

          {/* Section 3: Modeled Outputs */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Modeled Outputs
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              SettleRate surfaces decision-grade outcomes rather than promotional metrics.
            </p>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Monthly payment obligations
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Total interest paid over the life of the loan
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Cash required at close
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Time horizon at which principal accumulation exceeds interest
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Total cost of capital
              </li>
            </ul>
            <p className="text-sm italic text-foreground/50 mt-4">
              Rationale: Long-term cost and capital requirements are central to mortgage decisions and are often underrepresented.
            </p>
          </div>

          {/* Section 4: Interpretation Boundaries */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Interpretation Boundaries
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              SettleRate does not provide advice, recommendations, or guarantees.
            </p>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Outputs reflect modeled outcomes under stated assumptions.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Results do not predict future rates, approval, or loan terms.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Users retain full responsibility for decisions and outcomes.
              </li>
            </ul>
          </div>

          {/* Section 5: Independence */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Independence
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              SettleRate operates independently of lenders and originators.
            </p>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                No referral fees
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                No lender compensation
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                No ranking or promotion of providers
              </li>
            </ul>
            <p className="text-sm italic text-foreground/50 mt-4">
              Rationale: Independence preserves analytical integrity.
            </p>
          </div>

          {/* Footer Disclosure */}
          <div className="mt-16 border-t border-border/50 pt-12">
            <p className="text-xs leading-relaxed text-foreground/50">
              SettleRate provides analytical modeling only and does not originate, broker, or recommend mortgage products, nor provide financial, legal, or tax advice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
