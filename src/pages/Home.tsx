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

export default function Home() {
  return (
    <div className="space-y-32">
      {/* Hero */}
      <section className="pt-8 text-center sm:pt-12 lg:pt-16">
        <h1 className="mx-auto max-w-3xl font-serif text-3xl font-normal tracking-tight sm:text-4xl lg:text-5xl lg:leading-tight">
          Mortgage decisions, modeled precisely.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
          Analyze purchase and refinance scenarios, understand long-term cost
          implications, and generate lender-ready summaries—without sales
          pressure or guesswork.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="min-w-40">
            <Link to="/auth">Start free</Link>
          </Button>
          <Link
            to="/pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-4xl">
        <div className="grid gap-12 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-14">
          {capabilities.map((capability) => (
            <div key={capability.title} className="space-y-3">
              <h3 className="text-sm font-medium tracking-wide text-foreground">
                {capability.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {capability.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="mx-auto max-w-2xl text-center">
        <blockquote className="space-y-6">
          <p className="font-serif text-lg leading-relaxed text-foreground sm:text-xl">
            SettleRate is built to reduce uncertainty—not sell loans.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We provide structured analysis using transparent assumptions so
            decisions can be made independently and confidently.
          </p>
        </blockquote>
        <p className="mt-10 text-xs text-muted-foreground/70">
          SettleRate is not a lender and does not offer mortgage products.
        </p>
      </section>

      {/* Final CTA */}
      <section className="pb-8 text-center">
        <h2 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
          Begin with a single scenario.
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Free to start. No credit card required.
        </p>
        <Button asChild size="lg" className="mt-10 min-w-40">
          <Link to="/auth">Start free</Link>
        </Button>
      </section>
    </div>
  );
}
