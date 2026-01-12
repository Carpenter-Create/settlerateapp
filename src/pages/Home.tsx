import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalyticalSurface } from "@/components/marketing/AnalyticalSurface";

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

// Section wrapper for consistent full-width treatment
function Section({ 
  children, 
  className,
  variant = "white"
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: "white" | "neutral";
}) {
  return (
    <section 
      className={cn(
        "w-full",
        variant === "neutral" ? "bg-[hsl(40_20%_97%)]" : "bg-white",
        className
      )}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
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
          Purpose: Establish category and seriousness.
          Height: ~75-80% viewport for spatial authority
          ═══════════════════════════════════════════════════════════════ */}
      <section className="flex w-full min-h-[72vh] lg:min-h-[80vh] bg-[hsl(40_18%_96%)]">
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

          {/* Analytical Surface - Decision-Grade Document Fragment */}
          <div className="mx-auto mt-20 w-full max-w-4xl sm:mt-24 lg:mt-28">
            <AnalyticalSurface />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — THE REFRAME (Category Kill Shot)
          Purpose: Explicitly separate from marketplaces.
          ═══════════════════════════════════════════════════════════════ */}
      <Section variant="white" className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-center text-base leading-relaxed text-foreground/70 sm:text-lg sm:leading-relaxed">
            SettleRate is an analytical tool for evaluating mortgage structures—not a marketplace for browsing rates or providers.
          </p>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — WHAT THE CALCULATOR ENABLES
          Purpose: Expand capability without selling.
          ═══════════════════════════════════════════════════════════════ */}
      <Section variant="neutral" className="py-20 lg:py-28">
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
          Purpose: Justify existence intellectually.
          ═══════════════════════════════════════════════════════════════ */}
      <Section variant="white" className="py-20 lg:py-28">
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
          <div className="mt-12 border-t border-border/50 pt-10">
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
          SECTION 5 — THE SETTLERATE FRAMEWORK
          Purpose: Institutionalize the product.
          ═══════════════════════════════════════════════════════════════ */}
      <Section variant="neutral" className="py-20 lg:py-28">
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
              className="group relative border-l-2 border-foreground/10 bg-white py-7 pl-7 pr-6 transition-all hover:border-foreground/30 sm:py-6 sm:pl-8 sm:pr-8"
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
          SECTION 6 — TRUST WITHOUT MARKETING
          Purpose: Close with confidence, not persuasion.
          ═══════════════════════════════════════════════════════════════ */}
      <Section variant="white" className="py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <blockquote className="space-y-6">
            <p className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.25] text-foreground sm:text-3xl">
              Built to reduce uncertainty—not sell loans.
            </p>
          </blockquote>

          <p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-foreground/50">
            SettleRate is not a lender, broker, or financial advisor and does not offer mortgage products or personalized advice.
          </p>

          <div className="mt-12">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
              Begin with a single scenario.
            </h2>
            <p className="mt-4 text-sm text-foreground/60">
              Free to start. No credit card required.
            </p>
            <Button asChild size="lg" className="mt-8 min-w-44 h-12 text-base">
              <Link to="/auth">Start free</Link>
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
