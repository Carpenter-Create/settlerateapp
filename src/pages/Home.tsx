import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalyticalSurface } from "@/components/marketing/AnalyticalSurface";

const capabilities = [
  {
    title: "Precision-based calculations",
    description:
      "Model payments, taxes, insurance, and PMI using transparent, documented assumptions.",
  },
  {
    title: "Scenario comparison, normalized",
    description:
      "Evaluate multiple loan structures side by side with consistent inputs and methodology.",
  },
  {
    title: "Professional outputs",
    description:
      "Export clean, structured summaries designed for underwriting conversations and documentation.",
  },
  {
    title: "Cost visibility",
    description:
      "See amortization, long-term interest, and total cost surfaced explicitly—not obscured.",
  },
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

const useCases = [
  {
    title: "Homebuyers",
    description: "Model scenarios before speaking with lenders. Understand tradeoffs between down payment, term, and monthly obligation.",
    href: "/how-it-works",
  },
  {
    title: "Advisors",
    description: "Generate client-ready documentation. Support pre-qualification discussions with structured, reproducible analysis.",
    href: "/advisors",
  },
  {
    title: "Investors",
    description: "Evaluate financing structures for rental properties. Compare cash flow under different leverage assumptions.",
    href: "/investors",
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
      {/* Hero Section - Neutral tinted background */}
      <section className="w-full bg-[hsl(40_20%_97%)]">
        <div className="mx-auto max-w-[1280px] px-6 py-24 lg:px-12 lg:py-32 xl:px-16 xl:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
              Mortgage decisions,
              <br />
              modeled precisely.
            </h1>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-foreground/70 sm:text-xl">
              A neutral framework for understanding mortgage outcomes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <Button asChild size="lg" className="min-w-44 h-12 text-base">
                <Link to="/auth">Start free</Link>
              </Button>
              <Link
                to="/pricing"
                className="text-sm text-foreground/60 transition-colors hover:text-foreground"
              >
                Pricing
              </Link>
            </div>
          </div>

          {/* Analytical Surface - Canonical Hero Visual */}
          <div className="mx-auto mt-16 w-full max-w-4xl lg:mt-20">
            <AnalyticalSurface variant="consumer" />
          </div>
        </div>
      </section>

      {/* Core Value Grid - White background */}
      <Section variant="white" className="py-20 lg:py-28">
        <div className="grid gap-12 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
          {capabilities.map((capability) => (
            <div key={capability.title} className="space-y-3">
              <h3 className="text-base font-medium tracking-[-0.01em] text-foreground">
                {capability.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-foreground/60">
                {capability.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Positioning Statement - Neutral background */}
      <Section variant="neutral" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <blockquote className="space-y-6">
            <p className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.25] text-foreground sm:text-3xl lg:text-4xl">
              SettleRate is built to reduce uncertainty—not sell loans.
            </p>
            <p className="text-base leading-relaxed text-foreground/60 sm:text-lg">
              We provide structured analysis using transparent assumptions so
              decisions can be made independently and confidently.
            </p>
          </blockquote>
          <p className="mt-8 text-sm text-foreground/50">
            SettleRate is not a lender and does not offer mortgage products.
          </p>
        </div>
      </Section>

      {/* Problem Statement - White background */}
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

      {/* Framework Section - Neutral background */}
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

        {/* Horizontal Cards */}
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

      {/* Use Cases Section - White background */}
      <Section variant="white" className="py-20 lg:py-28">
        <div className="mb-12 lg:mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
            Use Cases
          </p>
          <h2 className="mt-4 font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
            Explore how SettleRate is used
          </h2>
        </div>

        {/* Horizontal Use Case Cards */}
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {useCases.map((useCase) => (
            <Link
              key={useCase.title}
              to={useCase.href}
              className="group block border border-border/60 bg-white p-6 transition-all hover:border-foreground/20 hover:shadow-sm lg:p-8"
            >
              <h3 className="text-base font-medium text-foreground group-hover:text-foreground">
                {useCase.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/60">
                {useCase.description}
              </p>
              <span className="mt-4 inline-block text-sm text-foreground/40 transition-colors group-hover:text-foreground/60">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Final CTA Section - Neutral background */}
      <Section variant="neutral" className="py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl lg:text-4xl">
            Begin with a single scenario.
          </h2>
          <p className="mt-5 text-base text-foreground/60">
            Free to start. No credit card required.
          </p>
          <Button asChild size="lg" className="mt-8 min-w-44 h-12 text-base">
            <Link to="/auth">Start free</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
