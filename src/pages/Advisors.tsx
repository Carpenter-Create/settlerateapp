import { Link } from "react-router-dom";

const useCases = [
  "Exploring alternative loan structures with clients",
  "Normalizing assumptions across scenarios",
  "Supporting internal review and documentation",
  "Improving expectation alignment during planning discussions",
];

const outputs = [
  "Clear assumptions",
  "Consistent formatting",
  "Lender-ready summaries",
  "Suitable for internal files or correspondence",
];

const boundaries = [
  "SettleRate does not provide recommendations.",
  "It does not replace underwriting, advisory, or fiduciary responsibility.",
  "It is intended to support—not substitute—professional judgment.",
];

export default function Advisors() {
  return (
    <div className="mx-auto max-w-2xl space-y-16">
      {/* Page Title */}
      <section>
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Structured mortgage scenario analysis for professionals.
        </h1>
      </section>

      {/* Opening Context */}
      <section className="space-y-4">
        <p className="text-base leading-relaxed text-muted-foreground">
          SettleRate provides a neutral framework for modeling mortgage outcomes under consistent assumptions, designed to support professional review, comparison, and documentation.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          It is intended to complement—not replace—lenders, advisors, and underwriting processes by improving clarity and expectation alignment early in the decision process.
        </p>
      </section>

      {/* Professional Use Cases */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Professional use cases
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

      {/* Role Boundaries */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Role boundaries
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {boundaries.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Closing */}
      <section className="border-t border-border/50 pt-12 text-center">
        <p className="font-serif text-lg leading-relaxed text-foreground">
          SettleRate is designed to support clarity and consistency in
          professional mortgage discussions.
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
