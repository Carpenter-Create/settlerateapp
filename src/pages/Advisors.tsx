import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdvisorRequestModal } from "@/components/advisors/AdvisorRequestModal";

/**
 * Advisors Page - Eligibility-Based Access
 * 
 * Professional access for advisors operating without sales pressure.
 * Non-promotional, institutional tone.
 */

const advisorAudience = [
  "Fiduciary-minded advisors and planners",
  "Real estate professionals supporting informed client decisions",
  "Professionals who value transparency over conversion",
];

const advisorCapabilities = [
  "Client-facing mortgage scenario modeling",
  "Shareable, neutral outputs without lender branding",
  "Clear assumptions documented and preserved",
  "Professional workflows across multiple clients",
];

export default function Advisors() {
  const [showRequestModal, setShowRequestModal] = useState(false);

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
              Professional access for advisors operating without sales pressure
            </h1>
            <div 
              className="max-w-2xl space-y-4 text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              <p>
                SettleRate Advisor is designed for professionals who prioritize client clarity, documented assumptions, and neutral analysis—without lead generation, referral incentives, or product placement.
              </p>
              <p>
                Advisor access is granted to professionals whose use aligns with these standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHO ADVISOR ACCESS IS FOR
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-secondary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              Who Advisor Access Is For
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              Advisor access is intended for:
            </p>
            <ul 
              className="space-y-4"
              style={{ marginTop: '24px' }}
            >
              {advisorAudience.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 text-[15px] leading-relaxed text-foreground/65"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: '24px' }}
            >
              It is not designed for lead generation, rate promotion, or transaction steering.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHAT ADVISOR ACCESS ENABLES
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-primary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
              What Advisor Access Enables
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              Advisor access enables:
            </p>
            <ul 
              className="space-y-4"
              style={{ marginTop: '24px' }}
            >
              {advisorCapabilities.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 text-[15px] leading-relaxed text-foreground/65"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLEAR SEPARATION OF ROLES
          ══════════════════════════════════════════════════════════════════ */}
      <section 
        className="w-full bg-surface-tertiary"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-2xl">
              Clear separation of roles
            </h2>
            <p 
              className="text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]"
              style={{ marginTop: 'var(--space-card-gap)' }}
            >
              SettleRate does not originate, broker, recommend, or refer mortgage products and does not participate in transactions. Advisors remain the source of judgment and guidance.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CLOSING CTA
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-surface-secondary">
        <div 
          className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16"
          style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
        >
          <div className="mx-auto max-w-xl text-center">
            <Button 
              size="lg" 
              className="min-w-52 h-12 text-base"
              onClick={() => setShowRequestModal(true)}
            >
              Request advisor access
            </Button>
          </div>
        </div>
      </section>

      <AdvisorRequestModal 
        open={showRequestModal} 
        onOpenChange={setShowRequestModal} 
      />
    </div>
  );
}
