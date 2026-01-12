import { Link } from "react-router-dom";
import { AnalyticalSurface } from "@/components/marketing/AnalyticalSurface";

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
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full bg-[hsl(40_20%_97%)]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-5xl">
              Infrastructure for mortgage decision intelligence.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/70 sm:text-lg">
              Normalized analysis. Exportable logic. System-level clarity.
            </p>
          </div>

          {/* Analytical Surface - Investor variant */}
          <div className="mx-auto mt-14 w-full max-w-4xl lg:mt-16">
            <AnalyticalSurface variant="investor" />
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-12 lg:py-24">
          {/* Problem */}
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Problem
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              Mortgage decisions are frequently evaluated using inconsistent tools,
              opaque assumptions, and sales-driven calculators. SettleRate is a
              neutral framework for understanding mortgage outcomes, positioned
              upstream of marketplaces and transactional platforms.
            </p>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              Rather than competing as a lender or lead-generation marketplace,
              SettleRate provides structured scenario modeling, clear assumptions,
              and documented outputs that support better decision-making and
              professional review.
            </p>
          </div>

          {/* Approach */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Approach
            </h2>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {approach.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Category Positioning */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Category positioning
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground/60">
              SettleRate is:
            </p>
            <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {category.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/60">
              It is infrastructure for mortgage decision clarity.
            </p>
          </div>

          {/* Strategic Value */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Strategic value
            </h2>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {strategicValue.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Optionality */}
          <div className="mt-14 space-y-4">
            <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
              Optionality
            </h2>
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/60">
              {optionality.map((item) => (
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
              SettleRate is designed to be durable, neutral infrastructure for
              mortgage decision-making—not a transactional business.
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
