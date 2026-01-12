import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    title: "Precision-based calculations",
    description:
      "Model payments, taxes, insurance, and PMI using transparent assumptions.",
  },
  {
    title: "Scenario comparison, normalized",
    description:
      "Evaluate multiple loan structures side by side with consistent inputs.",
  },
  {
    title: "Reports suitable for professional review",
    description:
      "Export clean, structured summaries designed for underwriting conversations and documentation.",
  },
  {
    title: "Cost implications, surfaced clearly",
    description:
      "See amortization, long-term interest, and total cost without interpretation.",
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

const constraints = [
  "We do not originate, broker, or refer mortgage products.",
  "We do not provide personalized financial, legal, or tax advice.",
  "We do not sell user data or generate revenue from lender referrals.",
  "We do not use incentive-driven defaults or promotional inputs.",
];

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero Section - White */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="text-center">
            <h1 className="mx-auto max-w-3xl font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] sm:text-4xl lg:text-5xl">
              Mortgage decisions, modeled precisely.
            </h1>
            <p className="mx-auto mt-space-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-space-7 sm:text-lg sm:leading-relaxed">
              A neutral framework for understanding mortgage outcomes.
            </p>
            <div className="mt-space-8 flex flex-col items-center justify-center gap-space-5 sm:mt-space-8 sm:flex-row sm:gap-space-4">
              <Button asChild size="lg" className="min-w-40">
                <Link to="/auth">Start free</Link>
              </Button>
              <Link
                to="/pricing"
                className="mt-space-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mt-0"
              >
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section - White */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-space-7 sm:grid-cols-2 sm:gap-x-space-8 sm:gap-y-space-7">
            {capabilities.map((capability) => (
              <div key={capability.title} className="space-y-space-3">
                <h3 className="text-sm font-medium tracking-wide text-foreground">
                  {capability.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Framework Section - Soft Gray */}
      <section className="surface-sunken">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          {/* Header */}
          <div className="mb-space-8">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              The SettleRate Framework
            </p>
            <h2 className="mt-space-3 font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] sm:text-3xl">
              How mortgage decisions are evaluated
            </h2>
            <p className="mt-space-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A consistent analytical structure designed for clarity, comparability, and professional review.
            </p>
          </div>

          {/* Horizontal Cards */}
          <div className="space-y-space-4">
            {frameworkPillars.map((pillar) => (
              <article
                key={pillar.title}
                className="group relative border-l-2 border-border/60 bg-background py-space-6 pl-space-6 pr-space-5 transition-colors hover:border-foreground/30 sm:py-space-5 sm:pl-space-7 sm:pr-space-6"
              >
                <h3 className="font-serif text-base font-medium tracking-[-0.01em] text-foreground sm:text-lg">
                  {pillar.title}
                </h3>
                <p className="mt-space-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px] sm:leading-[1.7]">
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section - White */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center">
            <blockquote className="space-y-space-5">
              <p className="font-serif text-lg font-medium tracking-[-0.01em] leading-[1.3] text-foreground sm:text-xl">
                SettleRate is built to reduce uncertainty—not sell loans.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We provide structured analysis using transparent assumptions so
                decisions can be made independently and confidently.
              </p>
            </blockquote>
            <p className="mt-space-6 text-xs text-muted-foreground/70">
              SettleRate is not a lender and does not offer mortgage products.
            </p>
          </div>
        </div>
      </section>

      {/* Structural Problem Section - Soft Gray */}
      <section className="surface-sunken">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] sm:text-3xl">
            The problem with mortgage calculators
          </h2>
          <div className="mt-space-6 space-y-space-5 text-[15px] leading-[1.7] text-muted-foreground sm:text-base sm:leading-[1.75]">
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
          <div className="mt-space-8 border-t border-border/50 pt-space-7">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              What SettleRate does not do
            </h3>
            <ul className="mt-space-5 space-y-space-3">
              {constraints.map((constraint, index) => (
                <li
                  key={index}
                  className="flex items-start gap-space-3 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                  <span>{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA Section - White */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] sm:text-3xl">
              Begin with a single scenario.
            </h2>
            <p className="mt-space-4 text-sm text-muted-foreground">
              Free to start. No credit card required.
            </p>
            <Button asChild size="lg" className="mt-space-6 min-w-40">
              <Link to="/auth">Start free</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
