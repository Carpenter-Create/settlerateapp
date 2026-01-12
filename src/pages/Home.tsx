import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalyticalSurface } from "@/components/marketing/AnalyticalSurface";

/**
 * Homepage - Canonical Institutional Framing (Locked)
 * 
 * Micro-Copy Rules:
 * - Buttons administer access, not persuade
 * - Captions frame analysis, not coach
 * - Footers set boundaries, not reassure
 * 
 * Color-Blocking System:
 * Structure without gloss. Authority without marketing theatrics.
 */

// Canonical feature language - capability framing, not benefit framing
const structureCapabilities = [
  "Time-horizon analysis",
  "Structural tradeoff evaluation",
  "PMI exposure modeling",
  "Refinance break-even analysis",
];

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
                <Link to="/auth">Begin analysis</Link>
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
          {/* Caption - Institutional framing */}
          <p className="mb-4 text-center text-xs text-foreground/50">
            Example of normalized scenario modeling using transparent assumptions.
          </p>
          {/* Card inset using Surface Primary with thin border */}
          <div className="rounded-md border border-foreground/[0.08] bg-surface-primary">
            <AnalyticalSurface />
          </div>
          {/* Secondary caption */}
          <p className="mt-3 text-center text-[11px] text-foreground/40">
            Illustrative outputs for comparative evaluation only.
          </p>
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
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              Scope
            </p>
            <h3 className="mt-2 text-sm font-medium text-foreground">
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
            Framework
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
          <Button asChild size="lg" className="mt-8 min-w-44 h-12 text-base">
            <Link to="/auth">Begin analysis</Link>
          </Button>

          <p className="mt-6 text-xs text-foreground/50">
            Analytical access. No product promotion.
          </p>

          <p className="mx-auto mt-12 max-w-lg text-[11px] leading-relaxed text-foreground/40">
            SettleRate provides analytical modeling only and does not originate, broker, or recommend mortgage products.
          </p>
        </div>
      </Section>
    </div>
  );
}
