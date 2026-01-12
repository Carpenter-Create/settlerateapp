import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Pricing Page - Institutional Access Model
 * 
 * Focused on access scope, not feature marketing.
 * No urgency, no value-based persuasion, no savings framing.
 */

const singleScenarioFeatures = [
  "Single scenario modeling",
  "Outcome-focused metrics",
  "No recommendations or rankings",
];

const fullComparisonFeatures = [
  "Multi-scenario comparison",
  "Normalized assumptions",
  "Long-term cost and time-horizon analysis",
  "Exportable summaries",
];

export default function Pricing() {
  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ 
          paddingTop: 'var(--space-hero-top)', 
          paddingBottom: 'var(--space-hero-bottom)' 
        }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-[2.75rem]">
              Pricing
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Access to a neutral mortgage modeling environment. No product promotion. No referral incentives.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PRICING TIERS
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            {/* Tiers Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Tier 1: Single Scenario Modeling */}
              <div className="flex flex-col border-l-2 border-foreground/10 bg-surface-primary p-8">
                <h3 className="font-serif text-lg font-medium text-foreground">
                  Single scenario modeling
                </h3>
                <p 
                  className="text-sm leading-relaxed text-foreground/60"
                  style={{ marginTop: 'var(--space-text-stack)' }}
                >
                  Model one mortgage scenario using standardized assumptions to understand baseline outcomes.
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {singleScenarioFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-foreground/30"
                        strokeWidth={1.5}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild variant="outline" className="mt-8 w-full" size="lg">
                  <Link to="/auth">Begin analysis</Link>
                </Button>
              </div>

              {/* Tier 2: Full Scenario Comparison */}
              <div className="flex flex-col border-l-2 border-foreground/10 bg-surface-primary p-8">
                <h3 className="font-serif text-lg font-medium text-foreground">
                  Full scenario comparison
                </h3>
                <p 
                  className="text-sm leading-relaxed text-foreground/60"
                  style={{ marginTop: 'var(--space-text-stack)' }}
                >
                  Compare multiple mortgage structures using normalized assumptions and export results for professional review.
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {fullComparisonFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-foreground/30"
                        strokeWidth={1.5}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild className="mt-8 w-full" size="lg">
                  <Link to="/auth">Upgrade access</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SCOPE AND LIMITATIONS
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
              Scope and limitations
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate provides analytical modeling only. It does not originate, broker, recommend, or refer mortgage products, and does not provide financial, legal, or tax advice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
