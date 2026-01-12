import { Link } from "react-router-dom";

/**
 * Investors Page - Canonical Institutional Framing
 * 
 * Locked ~300 word category narrative.
 * Suitable for memo, deck, or data room.
 */

export default function Investors() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full bg-surface-primary">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-5xl">
              SettleRate — Category Narrative
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section - Locked Investor Narrative (~300 words) */}
      <section className="w-full bg-surface-secondary">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-12 lg:py-24">
          {/* Locked Investor Narrative - DO NOT SHORTEN */}
          <div className="space-y-6 text-base leading-[1.85] text-foreground/70">
            <p>
              SettleRate is an independent mortgage analysis platform built to address a structural 
              gap in consumer finance: the absence of a neutral layer for evaluating mortgage decisions.
            </p>
            <p>
              Most mortgage tools exist within origination-driven ecosystems. Their purpose is 
              lead generation, not decision clarity. As a result, default assumptions are optimized 
              to emphasize monthly payment affordability while obscuring long-term cost, capital 
              requirements, and structural tradeoffs. Borrowers are shown quotes, not consequences.
            </p>
            <p>
              SettleRate operates outside this incentive structure. The platform evaluates mortgage 
              scenarios using normalized, transparent assumptions and presents outcomes in a format 
              suitable for professional review. Rather than promoting rates or lenders, SettleRate 
              models loan structures—down payment strategies, term length, PMI exposure, and time 
              horizon—surfacing total interest, break-even points, and cash flow implications.
            </p>
            <p>
              This approach positions SettleRate as a neutral analytical layer between borrowers, 
              advisors, and lenders. It does not originate loans, sell user data, or monetize 
              referrals. Its value lies in documentation, comparability, and decision integrity.
            </p>
            <p>
              SettleRate's long-term opportunity extends beyond consumer usage. By standardizing 
              how mortgage decisions are modeled and communicated, the platform becomes infrastructure: 
              a shared analytical language for advisors, underwriting conversations, and institutional 
              review. In a market dominated by sales-driven tooling, SettleRate competes on trust, 
              precision, and repeatability.
            </p>
          </div>

          {/* Closing */}
          <div className="mt-16 border-t border-foreground/[0.08] pt-12 text-center">
            <p className="font-serif text-lg leading-relaxed text-foreground">
              The neutral analytical layer mortgage decisions have been missing.
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
