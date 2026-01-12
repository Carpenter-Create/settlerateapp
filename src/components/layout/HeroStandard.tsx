import { ReactNode } from "react";

/**
 * HeroStandard - Canonical hero styling for marketing/informational pages
 * 
 * Single source of truth for hero typography and spacing.
 * All marketing pages must use this component.
 * 
 * Do not add page-specific overrides.
 * Do not add animations, badges, or marketing embellishments.
 */

interface HeroStandardProps {
  /** Main headline (H1) */
  headline: string;
  /** Optional subtitle paragraph(s) - can be string or React nodes for multiple paragraphs */
  subtitle?: ReactNode;
}

export function HeroStandard({ headline, subtitle }: HeroStandardProps) {
  return (
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
            {headline}
          </h1>
          {subtitle && (
            <div 
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: 'var(--space-text-stack)' }}
            >
              {typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
