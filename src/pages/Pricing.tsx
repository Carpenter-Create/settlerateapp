import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pricing Page - Canonical Institutional Framing
 * 
 * Administrative, not persuasive. Reads like terms of access.
 * No testimonials, social proof, competitor comparisons, or urgency language.
 * Spacing tokenized via CSS custom properties.
 */

const analyticalFeatures = [
  "Create and evaluate mortgage scenarios",
  "Compare structural variables under standardized assumptions",
  "View modeled outcomes across time horizon",
];

const professionalFeatures = [
  "Unlimited scenario modeling",
  "Saved scenarios and revisions",
  "Exportable PDF summaries",
  "Advisor- and lender-ready outputs",
];

type BillingInterval = "annual" | "monthly";

const pricing = {
  annual: {
    price: "$79",
    period: "/year",
    subtext: "Billed annually",
  },
  monthly: {
    price: "$9",
    period: "/month",
    subtext: "Billed monthly",
  },
};

export default function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const currentPricing = pricing[interval];

  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════════
          PAGE HERO
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
              Access to analytical mortgage modeling
            </h1>
            <p 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Pricing reflects access to structured scenario evaluation and professional-grade outputs. SettleRate does not participate in origination, referrals, or transaction-based compensation.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: PRICING STRUCTURE
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              Pricing structure
            </p>
            <h2 
              className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Subscription access
            </h2>
            <p 
              className="text-[15px] leading-[1.85] text-foreground/60"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate is offered on a subscription basis to maintain independence from lending, brokerage, and referral incentives. Fees are not contingent on loan outcomes, selections, or transactions.
            </p>

            {/* Plans Grid */}
            <div 
              className="grid gap-6 sm:grid-cols-2"
              style={{ marginTop: '48px' }}
            >
              {/* Analytical Access (Free) */}
              <div className="flex flex-col border-l-2 border-foreground/10 bg-surface-primary p-8">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-foreground/50">
                    Analytical Access
                  </p>
                  <h3 className="font-serif text-lg font-medium text-foreground">Free</h3>
                </div>

                <p 
                  className="text-sm text-foreground/60"
                  style={{ marginTop: 'var(--space-text-stack)' }}
                >
                  Access to core modeling functionality.
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {analyticalFeatures.map((feature) => (
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

              {/* Professional Access (Pro) */}
              <div className="flex flex-col border-l-2 border-foreground/10 bg-surface-primary p-8">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-foreground/50">
                    Professional Access
                  </p>
                  <h3 className="font-serif text-lg font-medium text-foreground">Pro</h3>
                </div>

                <p 
                  className="text-sm text-foreground/60"
                  style={{ marginTop: 'var(--space-text-stack)' }}
                >
                  Extended access designed for documentation and professional context.
                </p>

                {/* Billing Toggle - Annual visually primary */}
                <div className="mt-5 flex gap-1 rounded-sm border border-border/50 p-1">
                  <button
                    onClick={() => setInterval("annual")}
                    className={cn(
                      "flex-1 rounded-sm px-3 py-2 text-xs font-medium transition-colors",
                      interval === "annual"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Annual
                  </button>
                  <button
                    onClick={() => setInterval("monthly")}
                    className={cn(
                      "flex-1 rounded-sm px-3 py-2 text-xs font-medium transition-colors",
                      interval === "monthly"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Monthly
                  </button>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-3xl text-foreground">{currentPricing.price}</span>
                    <span className="text-sm text-foreground/50">
                      {currentPricing.period}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/50">
                    {currentPricing.subtext}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {professionalFeatures.map((feature) => (
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
                  <Link to="/auth">Upgrade to Professional Access</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: BILLING
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section-tight)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
              Billing terms
            </p>
            <h2 
              className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              Billing
            </h2>
            
            <ul 
              className="space-y-3"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              <li className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Available monthly or annually
              </li>
              <li className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                Subscription fees provide access to analytical tooling only
              </li>
              <li className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                No transaction-based pricing
              </li>
              <li className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/60">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
                No outcome-based fees
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          INTERPRETATION BOUNDARY
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-primary">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm leading-[1.8] text-foreground/50">
              SettleRate provides analytical modeling based on standardized assumptions. It does not originate, broker, or recommend mortgage products, and does not provide financial, legal, or tax advice.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          INDEPENDENCE STATEMENT
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm leading-[1.8] text-foreground/50">
              SettleRate does not receive compensation from lenders, brokers, or third parties based on user activity, loan selection, approval, or funding.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLOSING CTA
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary border-t border-border/30">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section-tight)', paddingBottom: 'var(--space-section-tight)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <Button asChild size="lg" className="min-w-44 h-12 text-base">
              <Link to="/auth">Access the platform</Link>
            </Button>
            <p className="mt-4 text-xs text-foreground/50">
              Independent analytical access. No product promotion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
