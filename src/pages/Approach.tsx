import { Link } from "react-router-dom";

const capabilities = [
  "Mortgage scenario modeling for purchase and refinance",
  "Side-by-side comparison under consistent assumptions",
  "Structured summaries and documentation",
  "Planning and review support",
];

const boundaries = [
  "SettleRate is not a lender or mortgage originator.",
  "It is not a broker or referral service.",
  "It is not a recommendation engine.",
  "It does not provide financial, lending, or investment advice.",
  "It does not replace professional judgment.",
];

const useCases = [
  "Exploring purchase and refinance scenarios",
  "Comparing loan structures under varying assumptions",
  "Supporting client education and expectation-setting",
  "Internal review and documentation",
];

const outputs = [
  "Clearly labeled assumptions",
  "Consistent formatting across scenarios",
  "Lender-ready summaries",
  "Planning and comparison orientation",
];

export default function Approach() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full bg-[hsl(40_20%_97%)]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-5xl">
              Our Approach
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-12 lg:py-24">
          {/* Canonical Category Definition - DO NOT SHORTEN */}
          <div className="space-y-5">
            <p className="text-base leading-[1.8] text-foreground/70">
              SettleRate is an independent mortgage analysis platform designed to evaluate loan structures under normalized assumptions.
            </p>
            <p className="text-base leading-[1.8] text-foreground/70">
              Unlike marketplaces or rate aggregators, SettleRate does not originate, broker, or promote mortgage products. It exists to surface the long-term financial implications of mortgage decisions—total interest, structural tradeoffs, and cash-flow consequences—using transparent, repeatable modeling suitable for professional review.
            </p>
          </div>

          {/* What SettleRate Does */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              What SettleRate does
            </h2>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {capabilities.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What SettleRate Does Not Do */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              What SettleRate does not do
            </h2>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {boundaries.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Why SettleRate Exists */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Why SettleRate exists
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              Mortgage decisions are often evaluated using inconsistent tools and
              unclear assumptions. SettleRate exists to introduce structure,
              consistency, and clarity into that process.
            </p>
          </div>

          {/* How SettleRate Is Used */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              How SettleRate is used
            </h2>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {useCases.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Outputs & Documentation */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Outputs and documentation
            </h2>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {outputs.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Closing Statement */}
          <div className="mt-16 border-t border-border/50 pt-12 text-center">
            <p className="font-serif text-lg leading-relaxed text-foreground">
              SettleRate is designed to support clarity, not replace judgment.
            </p>
            <p className="mt-6">
              <Link
                to="/contact"
                className="text-sm text-foreground/50 transition-colors hover:text-foreground"
              >
                Contact
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
