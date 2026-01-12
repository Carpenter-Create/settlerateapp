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
    <div className="mx-auto max-w-2xl space-y-16">
      {/* Page Title */}
      <section>
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Our Approach
        </h1>
      </section>

      {/* Opening Statement */}
      <section className="space-y-4">
        <p className="text-base leading-relaxed text-muted-foreground">
          SettleRate is a neutral framework for understanding mortgage outcomes.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          It provides structured, assumption-based analysis designed to support planning, comparison, and professional review.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          By focusing on clarity and consistency, SettleRate helps users evaluate mortgage scenarios without sales pressure, embedded incentives, or cognitive overload.
        </p>
      </section>

      {/* What SettleRate Does */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          What SettleRate does
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {capabilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* What SettleRate Does Not Do */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          What SettleRate does not do
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {boundaries.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Why SettleRate Exists */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Why SettleRate exists
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Mortgage decisions are often evaluated using inconsistent tools and
          unclear assumptions. SettleRate exists to introduce structure,
          consistency, and clarity into that process.
        </p>
      </section>

      {/* How SettleRate Is Used */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          How SettleRate is used
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {useCases.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Outputs & Documentation */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Outputs and documentation
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {outputs.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Closing Statement */}
      <section className="border-t border-border/50 pt-12 text-center">
        <p className="font-serif text-lg leading-relaxed text-foreground">
          SettleRate is designed to support clarity, not replace judgment.
        </p>
        <p className="mt-6">
          <Link
            to="/contact"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </p>
      </section>
    </div>
  );
}
