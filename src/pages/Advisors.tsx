import { Link } from "react-router-dom";
import { AnalyticalSurface } from "@/components/marketing/AnalyticalSurface";

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
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full bg-[hsl(40_20%_97%)]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-5xl">
              A standardized framework for mortgage evaluation.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/70 sm:text-lg">
              Structured outputs designed for client review, underwriting discussion, and documentation.
            </p>
          </div>

          {/* Analytical Surface - Advisor variant */}
          <div className="mx-auto mt-14 w-full max-w-4xl lg:mt-16">
            <AnalyticalSurface variant="advisor" />
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

          {/* Professional Use Cases */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Professional use cases
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

          {/* Role Boundaries */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Role boundaries
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

          {/* Closing */}
          <div className="mt-16 border-t border-border/50 pt-12 text-center">
            <p className="font-serif text-lg leading-relaxed text-foreground">
              SettleRate is designed to support clarity and consistency in
              professional mortgage discussions.
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
