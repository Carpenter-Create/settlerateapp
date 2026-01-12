import React from "react";
import { HeroStandard } from "@/components/layout/HeroStandard";

/**
 * DocumentPage - Canonical layout for legal/informational documents
 *
 * Provides consistent hero rhythm, spacing, and surface backgrounds
 * for pages like Terms, Privacy, and similar documents.
 */

type DocumentPageProps = {
  title: string;
  subtitle?: string | string[];
  children: React.ReactNode;
};

export function DocumentPage({ title, subtitle, children }: DocumentPageProps) {
  return (
    <div className="w-full">
      <HeroStandard headline={title} subtitle={subtitle} />

      <section
        className="w-full bg-surface-secondary"
        style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-3xl">
            <article className="text-[15px] leading-[1.75] text-foreground/60">
              {children}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
