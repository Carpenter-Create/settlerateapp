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
          {/* ═══════════════════════════════════════════════════════════════
              LOCKED ABOUT STATEMENT (Regulator-Safe, Investor-Safe, Advisor-Safe)
              DO NOT DILUTE OR SHORTEN
              ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-5">
            <p className="text-base leading-[1.85] text-foreground/70">
              SettleRate is an independent mortgage analysis platform designed to provide a neutral framework for evaluating mortgage decisions. The platform models loan scenarios using standardized, transparent assumptions and surfaces long-term cost, capital requirements, and structural tradeoffs that are often obscured by sales-driven tools. SettleRate does not originate, broker, recommend, or refer mortgage products, nor does it provide personalized financial, legal, or tax advice. It does not monetize through lender referrals or user data. Instead, SettleRate exists to support informed decision-making by producing consistent, reproducible analyses suitable for professional review by borrowers, advisors, lenders, and institutional stakeholders.
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
