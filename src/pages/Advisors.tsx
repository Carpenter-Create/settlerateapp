import { Link } from "react-router-dom";

/**
 * Advisors Page - Canonical Institutional Framing
 * 
 * Locked advisor-facing explainer copy.
 * This is the page advisors forward to clients.
 */

const boundaries = [
  "SettleRate does not provide recommendations.",
  "It does not replace underwriting, advisory, or fiduciary responsibility.",
  "It is intended to support—not substitute—professional judgment.",
];

export default function Advisors() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full bg-surface-primary">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-5xl">
              A neutral framework for evaluating mortgage decisions
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section - Locked Advisor Copy */}
      <section className="w-full bg-surface-secondary">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-12 lg:py-24">
          {/* Locked Body Copy - DO NOT SHORTEN */}
          <div className="space-y-6 text-base leading-[1.85] text-foreground/70">
            <p>
              SettleRate is designed for situations where clarity matters more than conversion.
            </p>
            <p>
              Most mortgage tools are built inside sales ecosystems. Their default assumptions, 
              inputs, and outputs are optimized to generate attractive monthly payments and 
              downstream referrals. That framing obscures long-term cost, structural tradeoffs, 
              and time-horizon implications.
            </p>
            <p>
              SettleRate operates outside that incentive chain. We standardize assumptions across 
              scenarios—rates, taxes, insurance, PMI—and surface outcomes that are typically hidden: 
              total interest paid, capital required, and the point at which principal meaningfully 
              accumulates.
            </p>
            <p>
              The result is a consistent analytical framework suitable for advisor discussion, 
              lender review, and independent decision-making. SettleRate does not recommend 
              products or providers. It provides structure, context, and documentation so 
              decisions can be made with confidence.
            </p>
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

          {/* Independence Statement (appears once per page) */}
          <div className="mt-14 space-y-4">
            <p className="text-[15px] leading-relaxed text-foreground/60">
              SettleRate does not originate, broker, or recommend mortgage products. Outputs are analytical in nature and intended to support independent decision-making.
            </p>
          </div>

          {/* Closing Line - Locked */}
          <div className="mt-16 border-t border-foreground/[0.08] pt-12 text-center">
            <p className="font-serif text-lg leading-relaxed text-foreground">
              SettleRate is analysis—not advice, not advocacy, and not a marketplace.
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
