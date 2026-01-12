import { Link } from "react-router-dom";

const approach = [
  "Structured scenario modeling",
  "Clear, labeled assumptions",
  "Documented, exportable outputs",
  "Neutral positioning without sales incentives",
];

const category = [
  "Not a lead-generation tool",
  "Not a marketplace",
  "Not advice software",
];

const strategicValue = [
  "Complements lenders, advisors, and platforms",
  "Low regulatory exposure relative to lending products",
  "High trust surface",
  "Natural integration layer for adjacent workflows",
];

const optionality = [
  "Advisor tooling",
  "Enterprise licensing",
  "Platform partnerships",
  "White-label scenarios",
];

export default function Investors() {
  return (
    <div className="mx-auto max-w-2xl space-y-16">
      {/* Header */}
      <section>
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Investor Overview
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Strategic positioning narrative
        </p>
      </section>

      {/* Problem */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Problem
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Mortgage decisions are frequently evaluated using inconsistent tools,
          opaque assumptions, and sales-driven calculators. This creates
          confusion and misalignment between consumers and the professionals
          advising them.
        </p>
      </section>

      {/* Approach */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Approach
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          SettleRate does not compete as a lender or marketplace. It provides:
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {approach.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Category Positioning */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Category positioning
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          SettleRate is:
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {category.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          It is infrastructure for mortgage decision clarity.
        </p>
      </section>

      {/* Strategic Value */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Strategic value
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {strategicValue.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Optionality */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Optionality
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {optionality.map((item) => (
            <li key={item}>{item}</li>
          ))}
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
