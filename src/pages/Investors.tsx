import { Link } from "react-router-dom";

export default function Investors() {
  return (
    <div className="mx-auto max-w-2xl space-y-16">
      {/* Header */}
      <section className="text-center">
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Investor Overview
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Strategic positioning narrative
        </p>
      </section>

      {/* The Problem */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          The problem
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Mortgage decisions are often made using inconsistent assumptions,
          opaque calculators, and sales-driven tools. This creates confusion
          and misalignment between consumers and the professionals advising
          them.
        </p>
      </section>

      {/* The Approach */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          The approach
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          SettleRate does not compete as a lender or marketplace. It provides:
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Structured scenario modeling</li>
          <li>Clear, labeled assumptions</li>
          <li>Documented, exportable outputs</li>
          <li>Neutral positioning without sales incentives</li>
        </ul>
      </section>

      {/* Why This Matters */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Why this matters
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Reduces friction in decision-making</li>
          <li>Improves documentation quality</li>
          <li>Supports professional review workflows</li>
          <li>Aligns consumer and advisor understanding</li>
        </ul>
      </section>

      {/* Positioning */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Positioning
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          SettleRate occupies a distinct category:
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Not a marketplace</li>
          <li>Not a lead-generation engine</li>
          <li>Not advice software</li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          It is infrastructure for decision clarity.
        </p>
      </section>

      {/* Strategic Value */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Strategic value
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Complements lenders, advisors, and platforms</li>
          <li>Low regulatory exposure relative to lending products</li>
          <li>High trust surface</li>
          <li>Natural integration point for adjacent financial workflows</li>
        </ul>
      </section>

      {/* Long-Term Optionality */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Long-term optionality
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Advisor tooling</li>
          <li>White-label distribution</li>
          <li>Platform partnerships</li>
          <li>Enterprise licensing</li>
        </ul>
      </section>

      {/* Closing */}
      <section className="border-t border-border/50 pt-12 text-center">
        <p className="font-serif text-lg leading-relaxed text-foreground">
          SettleRate is designed to be durable, neutral infrastructure for
          mortgage decision-making—not a transactional business.
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
