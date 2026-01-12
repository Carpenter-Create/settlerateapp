import { Link } from "react-router-dom";

const sections = [
  {
    title: "Getting Started",
    items: [
      { name: "Creating your first scenario", available: false },
      { name: "Understanding inputs and assumptions", available: false },
      { name: "Reading your results", available: false },
    ],
  },
  {
    title: "Scenario Modeling",
    items: [
      { name: "Purchase vs. refinance scenarios", available: false },
      { name: "Comparing multiple scenarios", available: false },
      { name: "Sensitivity analysis", available: false },
    ],
  },
  {
    title: "Exports & Reports",
    items: [
      { name: "Exporting for professional review", available: false },
      { name: "Report formats and contents", available: false },
      { name: "Sharing scenarios", available: false },
    ],
  },
  {
    title: "Methodology",
    items: [
      { name: "Amortization calculations", available: false },
      { name: "Tax and insurance estimates", available: false },
      { name: "PMI assumptions", available: false },
    ],
  },
];

export default function Documentation() {
  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Header */}
      <section className="max-w-3xl">
        <h1 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] sm:text-3xl lg:text-4xl">
          Documentation
        </h1>
        <p className="mt-space-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Guides, methodology, and reference materials for SettleRate.
        </p>
        <p className="mt-space-4 text-sm text-muted-foreground/70">
          Documentation is currently in development. Check back soon.
        </p>
      </section>

      {/* Sections */}
      <section className="max-w-3xl">
        <div className="grid gap-space-8 sm:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                {section.title}
              </h2>
              <ul className="mt-space-4 space-y-space-3">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <span className="text-sm text-muted-foreground/60">
                      {item.name}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground/40">
                      Coming soon
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-3xl border-t border-border/50 pt-space-8">
        <p className="text-sm text-muted-foreground">
          Have questions about methodology or calculations?{" "}
          <Link
            to="/contact"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Contact us
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
