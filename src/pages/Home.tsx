import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalyticalSurface } from "@/components/marketing/AnalyticalSurface";

/**
 * Homepage Color-Blocking System (Locked)
 * 
 * Structure without gloss. Authority without marketing theatrics.
 * Use background tone—not decoration—to establish authority and pacing.
 * Institutional products rely on contrast for comprehension, not excitement.
 * 
 * Section mapping:
 * 1. Hero: Surface Primary (warm white) - calm authority
 * 2. Scenario Demo: Surface Secondary - "here is proof"
 * 3. Framework: Surface Primary - intellectual positioning
 * 4. Authority Break: Surface Tertiary - gravitas + pacing reset
 * 5. Use Cases: Alternating
 * 6. Final CTA: Surface Secondary
 */

// What the calculator enables - structural depth
const structureCapabilities = [
  "Multiple down-payment scenarios",
  "PMI vs no-PMI structures",
  "Time-horizon tradeoffs",
  "Refinance break-even modeling",
];

const frameworkPillars = [
  {
    title: "Standardized assumptions",
    body: "All scenarios are modeled using consistent, transparent inputs—rates, taxes, insurance, and PMI—so comparisons reflect structure, not guesswork.",
  },
  {
    title: "Scenario integrity",
    body: "Loan options are evaluated side by side using normalized inputs, preventing distortion and enabling meaningful comparison across structures and time horizons.",
  },
  {
    title: "Cost visibility",
    body: "Amortization, long-term interest, and total cost are surfaced explicitly, allowing tradeoffs to be understood without interpretation or sales framing.",
  },
  {
    title: "Professional outputs",
    body: "Clear, exportable summaries designed for lender review, advisor discussion, and documentation—not persuasion.",
  },
];

const constraints = [
  "We do not originate, broker, or refer mortgage products.",
  "We do not provide personalized financial, legal, or tax advice.",
  "We do not sell user data or generate revenue from lender referrals.",
  "We do not use incentive-driven defaults or promotional inputs.",
];

// Section wrapper using color-blocking system
function Section({ 
  children, 
  className,
  surface = "primary"
}: { 
  children: React.ReactNode; 
  className?: string;
  surface?: "primary" | "secondary" | "tertiary";
}) {
  return (
    <section 
      className={cn(
        "w-full",
        surface === "primary" && "bg-surface-primary",
        surface === "secondary" && "bg-surface-secondary",
        surface === "tertiary" && "bg-surface-tertiary",
        className
      )}
    >
      <div className="mx-auto max-w-[1320px] px-6 lg:px-12 xl:px-16">
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="w-full">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — HERO (Context + Gravity)
          Surface: Primary (warm white)
          Purpose: Calm authority. No interruption.
          ═══════════════════════════════════════════════════════════════ */}
      <section className="flex w-full min-h-[72vh] lg:min-h-[80vh] bg-surface-primary">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col justify-center px-6 py-20 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
              Mortgage decisions,
              <br />
              modeled precisely.
            </h1>
            <p className="mx-auto mt-10 max-w-xl text-lg leading-relaxed text-foreground/70 sm:mt-12 sm:text-xl">
              A neutral framework for understanding mortgage outcomes.
            </p>
            <div className="mt-14 sm:mt-16">
              <Button asChild size="lg" className="min-w-44 h-12 text-base">
                <Link to="/auth">Start free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — SCENARIO DEMONSTRATION BLOCK
          Surface: Secondary
          Purpose: "Here is proof." Visual transition into analysis.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="secondary" className="py-16 lg:py-20">
        <div className="mx-auto max-w-4xl">
          {/* Card inset using Surface Primary with thin border */}
          <div className="rounded-md border border-foreground/[0.08] bg-surface-primary">
            <AnalyticalSurface />
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — FRAMEWORK / PRINCIPLES
          Surface: Primary (white)
          Purpose: Intellectual positioning. Reads like a memo.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="primary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-center font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
            Most borrowers compare rates. SettleRate compares structures.
          </p>
          
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6">
            {structureCapabilities.map((item) => (
              <li
                key={item}
                className="flex items-center gap-4 text-[15px] text-foreground/65"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — THE PROBLEM WITH MORTGAGE CALCULATORS
          Surface: Secondary
          Purpose: Justify existence intellectually.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="secondary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl lg:text-4xl">
            The problem with mortgage calculators
          </h2>
          <div className="mt-8 space-y-6 text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]">
            <p>
              Most mortgage calculators exist within ecosystems designed to generate leads. 
              Their purpose is conversion, not clarity. Default inputs are often optimized 
              to produce attractive monthly payments, obscuring the long-term cost of debt 
              and the assumptions that drive those figures.
            </p>
            <p>
              This creates a structural distortion: the tools meant to inform borrowers 
              are built by parties with a financial interest in the transaction. Tax and 
              insurance estimates are frequently understated. Points and fees are minimized 
              in default views. Rate assumptions favor lender inventory.
            </p>
            <p>
              SettleRate exists outside this incentive chain. We standardize assumptions 
              using conservative, documented inputs—property tax rates from county assessors, 
              insurance estimates from regional averages, and amortization schedules that 
              surface total interest paid over the loan term. Every calculation is reproducible 
              and exportable for professional review.
            </p>
          </div>

          {/* Constraints Subsection */}
          <div className="mt-12 border-t border-foreground/[0.08] pt-10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              What SettleRate does not do
            </h3>
            <ul className="mt-6 space-y-4">
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
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — AUTHORITY BREAK (Mid-Page Anchor)
          Surface: Tertiary
          Purpose: Gravitas + pacing reset. Statement, not pitch.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="tertiary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.25] text-foreground sm:text-3xl">
            Built to reduce uncertainty—not sell loans.
          </p>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6 — THE SETTLERATE FRAMEWORK
          Surface: Primary
          Purpose: Institutionalize the product. Reads like methodology.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="primary" className="py-20 lg:py-28">
        <div className="mb-12 lg:mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
            The SettleRate Framework
          </p>
          <h2 className="mt-4 font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl lg:text-4xl">
            How mortgage decisions are evaluated
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-foreground/60 sm:text-base">
            A consistent analytical structure designed for clarity, comparability, and professional review.
          </p>
        </div>

        {/* Horizontal Cards - Methodology, not features */}
        <div className="space-y-4">
          {frameworkPillars.map((pillar) => (
            <article
              key={pillar.title}
              className="group relative border-l-2 border-foreground/10 bg-surface-secondary py-7 pl-7 pr-6 transition-all hover:border-foreground/30 sm:py-6 sm:pl-8 sm:pr-8"
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
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7 — FINAL CTA
          Surface: Secondary
          Purpose: Decision moment. Minimal copy. One CTA.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="secondary" className="py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
            Begin with a single scenario.
          </h2>
          <p className="mt-4 text-sm text-foreground/60">
            Free to start. No credit card required.
          </p>
          <Button asChild size="lg" className="mt-8 min-w-44 h-12 text-base">
            <Link to="/auth">Start free</Link>
          </Button>

          <p className="mx-auto mt-12 max-w-lg text-xs leading-relaxed text-foreground/40">
            SettleRate is not a lender, broker, or financial advisor and does not offer mortgage products or personalized advice.
          </p>
        </div>
      </Section>
    </div>
  );
}
