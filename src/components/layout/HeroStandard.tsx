import React from "react";

/**
 * HeroStandard - Canonical hero styling for marketing/informational pages
 *
 * Single source of truth for hero typography and spacing.
 * All marketing pages must use this component.
 *
 * Guardrail:
 * - subtitle must be string or string[]
 * - HeroStandard is responsible for paragraph rendering and spacing
 * - no page-specific typography/spacing wrappers
 */

interface HeroStandardProps {
  headline: string;
  subtitle?: string | string[];
}

export function HeroStandard({ headline, subtitle }: HeroStandardProps) {
  const paragraphs = Array.isArray(subtitle) ? subtitle : subtitle ? [subtitle] : [];

  return (
    <section
      className="w-full bg-surface-primary"
      style={{
        paddingTop: "var(--space-hero-top)",
        paddingBottom: "var(--space-hero-bottom)",
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] leading-[1.15] text-foreground sm:text-4xl lg:text-[2.75rem] text-balance">
            {headline}
          </h1>

          {paragraphs.length > 0 && (
            <div
              className="max-w-2xl text-base leading-[1.7] text-foreground/60 sm:text-lg"
              style={{ marginTop: "var(--space-text-stack)" }}
            >
              {paragraphs.map((p, idx) => (
                <p key={idx} style={{ marginTop: idx === 0 ? 0 : "16px" }}>
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
