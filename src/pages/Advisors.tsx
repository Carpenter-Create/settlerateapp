import { Link } from "react-router-dom";

const useCases = [
  "Pre-qualification scenario exploration",
  "Client education and expectation setting",
  "Internal review and documentation",
  "Scenario comparison under varying assumptions",
];

const outputs = [
  "Lender-ready scenario summaries",
  "Clearly labeled assumptions",
  "Consistent formatting across scenarios",
  "Suitable for internal review or correspondence",
];

export default function Advisors() {
  return (
    <div className="mx-auto max-w-2xl space-y-20">
      {/* Hero */}
      <section className="text-center">
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Structured mortgage scenario analysis for professionals.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          SettleRate provides structured, assumption-based mortgage scenario
          analysis designed to support professional review, comparison, and
          documentation.
        </p>
      </section>

      {/* What SettleRate Is */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          What SettleRate is
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          SettleRate is an analytical modeling platform for mortgage scenarios.
          It enables structured comparison and documentation of loan options
          under user-defined assumptions, designed to support professional
          workflows in lending, advisory, and financial planning contexts.
        </p>
      </section>

      {/* What SettleRate Is Not */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          What SettleRate is not
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Not a lender or mortgage originator</li>
          <li>Not a broker or referral service</li>
          <li>Not a recommendation engine</li>
          <li>Does not replace professional judgment</li>
        </ul>
      </section>

      {/* How Professionals Use SettleRate */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          How professionals use SettleRate
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {useCases.map((useCase) => (
            <li key={useCase}>{useCase}</li>
          ))}
        </ul>
      </section>

      {/* Outputs & Documentation */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-normal tracking-tight">
          Outputs and documentation
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {outputs.map((output) => (
            <li key={output}>{output}</li>
          ))}
        </ul>
      </section>

      {/* Closing */}
      <section className="border-t border-border/50 pt-12 text-center">
        <p className="font-serif text-lg leading-relaxed text-foreground">
          SettleRate is designed to support clarity—not replace professional
          discretion.
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
