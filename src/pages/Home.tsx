import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalyticalSurface } from "@/components/marketing/AnalyticalSurface";

/**
 * Homepage - StoryBrand Narrative Structure
 * 
 * Narrative Flow:
 * 1. Hero - User as decision-maker
 * 2. Problem - Structural distortion in existing tools
 * 3. Guide/Positioning - SettleRate outside incentive chain
 * 4. Framework - Methodological structure
 * 5. Proof - Scenario demonstration
 * 6. Stakes - Why clarity matters
 * 7. Scope - What we don't do
 * 8. Final CTA - Begin analysis
 */

const frameworkPillars = [
  {
    title: "Scenario modeling",
    body: "Mortgage structures are evaluated under consistent, documented assumptions to enable direct comparison across term length, down payment strategy, and time horizon.",
  },
  {
    title: "Normalized assumptions",
    body: "Rates, taxes, insurance, and PMI are standardized across scenarios to prevent distortion and preserve analytical integrity.",
  },
  {
    title: "Cost visibility",
    body: "Long-term interest, capital requirements, and total cost of capital are surfaced explicitly rather than inferred from monthly payment figures.",
  },
  {
    title: "Professional outputs",
    body: "Structured summaries designed for advisor discussion, lender review, and documentation—without embedded recommendations, rankings, or referral bias.",
  },
];

const constraints = [
  "We do not originate, broker, or refer mortgage products.",
  "We do not provide personalized financial, legal, or tax advice.",
  "We do not sell user data or generate revenue from lender referrals.",
  "We do not use incentive-driven defaults or promotional inputs.",
];

// Section wrapper using color-blocking system
function Section({ 
  children, 
  className,
  surface = "primary"
}: { 
  children: React.ReactNode; 
  className?: string;
  surface?: "primary" | "secondary" | "tertiary";
}) {
  return (
    <section 
      className={cn(
        "w-full",
        surface === "primary" && "bg-surface-primary",
        surface === "secondary" && "bg-surface-secondary",
        surface === "tertiary" && "bg-surface-tertiary",
        className
      )}
    >
      <div className="mx-auto max-w-[1320px] px-6 lg:px-12 xl:px-16">
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="w-full">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — HERO
          Surface: Primary
          Purpose: Center user as decision-maker. Minimal, calm.
          ═══════════════════════════════════════════════════════════════ */}
      <section className="flex w-full min-h-[72vh] lg:min-h-[80vh] bg-surface-primary">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col justify-center px-6 py-20 lg:px-12 lg:py-24 xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
              Mortgage decisions,
              <br />
              modeled precisely.
            </h1>
            <p className="mx-auto mt-10 max-w-xl text-lg leading-relaxed text-foreground/70 sm:mt-12 sm:text-xl">
              A neutral decision-support tool that helps you understand mortgage outcomes clearly—before engaging with listings, agents, or lenders.
            </p>
            <div className="mt-14 sm:mt-16">
              <Button asChild size="lg" className="min-w-44 h-12 text-base">
                <Link to="/auth">Begin analysis</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-foreground/50">
              Analytical access. No product promotion.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — PROBLEM
          Surface: Secondary
          Purpose: Articulate structural distortion. Justify existence.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="secondary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl lg:text-4xl">
            Most mortgage tools are built to convert—not to clarify.
          </h2>
          <div className="mt-8 space-y-6 text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]">
            <p>
              Most mortgage calculators exist inside ecosystems designed to generate leads. 
              Their purpose is conversion, not understanding. Default inputs often minimize 
              visible cost, obscure long-term tradeoffs, and rely on assumptions that are 
              rarely surfaced or explained.
            </p>
            <p>
              This creates a structural distortion: tools meant to inform borrowers are 
              built by parties with a financial interest in the transaction.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — GUIDE / POSITIONING
          Surface: Tertiary
          Purpose: Single canonical statement of neutrality.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="tertiary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl lg:text-4xl">
            SettleRate exists outside the incentive chain.
          </h2>
          <div className="mt-8 space-y-6 text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]">
            <p>
              SettleRate is a neutral modeling environment designed to support informed 
              decision-making—not to sell or recommend loans.
            </p>
            <p>
              Assumptions are standardized using documented, conservative inputs, and 
              outcomes typically hidden—total interest paid, capital requirements, and 
              time-horizon tradeoffs—are surfaced explicitly. Every calculation is 
              reproducible and exportable for professional review.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — FRAMEWORK
          Surface: Primary
          Purpose: Methodological structure, not feature cards.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="primary" className="py-20 lg:py-28">
        <div className="mb-12 lg:mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
            Framework
          </p>
          <h2 className="mt-4 font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl lg:text-4xl">
            How mortgage decisions are evaluated
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-foreground/60 sm:text-base">
            A consistent analytical structure designed for clarity, comparability, and professional review.
          </p>
        </div>

        {/* Horizontal Cards - Methodology, not features */}
        <div className="space-y-4">
          {frameworkPillars.map((pillar) => (
            <article
              key={pillar.title}
              className="group relative border-l-2 border-foreground/10 bg-surface-secondary py-7 pl-7 pr-6 transition-all hover:border-foreground/30 sm:py-6 sm:pl-8 sm:pr-8"
            >
              <h3 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-foreground/60">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — PROOF / COMPARISON
          Surface: Secondary
          Purpose: Demonstrate normalized scenario modeling.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="secondary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl mb-10">
          <p className="text-center font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
            Most borrowers compare rates. SettleRate compares structures.
          </p>
          <p className="mt-6 text-center text-[15px] leading-relaxed text-foreground/60">
            Below is an example of normalized scenario modeling using transparent assumptions.
          </p>
        </div>
        <div className="mx-auto max-w-4xl">
          {/* Card inset using Surface Primary with thin border */}
          <div className="rounded-md border border-foreground/[0.08] bg-surface-primary">
            <AnalyticalSurface />
          </div>
          {/* Secondary caption */}
          <p className="mt-3 text-center text-[11px] text-foreground/40">
            Illustrative outputs for comparative evaluation only.
          </p>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6 — STAKES
          Surface: Tertiary
          Purpose: Why clarity matters. Transition to decision.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="tertiary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] leading-[1.2] text-foreground sm:text-3xl">
            Understanding outcomes changes the conversation.
          </h2>
          <div className="mt-8 space-y-6 text-[15px] leading-[1.75] text-foreground/65 sm:text-base sm:leading-[1.8]">
            <p>
              When assumptions are consistent and outcomes are visible, decisions improve. 
              Conversations with advisors and lenders start from clarity rather than confusion.
            </p>
            <p>
              Without that clarity, borrowers often optimize for monthly payment alone—discovering 
              long-term cost or structural constraints only after committing.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7 — SCOPE
          Surface: Primary
          Purpose: What we don't do. Appears only once.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="primary" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
            Scope
          </p>
          <h2 className="mt-2 font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
            What SettleRate does not do
          </h2>
          <ul className="mt-8 space-y-4">
            {constraints.map((constraint, index) => (
              <li
                key={index}
                className="flex items-start gap-4 text-[15px] leading-relaxed text-foreground/65"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                <span>{constraint}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8 — FINAL CTA
          Surface: Secondary
          Purpose: Decision moment. Minimal copy. One CTA.
          ═══════════════════════════════════════════════════════════════ */}
      <Section surface="secondary" className="py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
            Begin with a single scenario.
          </h2>
          <Button asChild size="lg" className="mt-8 min-w-44 h-12 text-base">
            <Link to="/auth">Begin analysis</Link>
          </Button>
          <p className="mt-6 text-xs text-foreground/50">
            Analytical access. No product promotion.
          </p>
        </div>
      </Section>
    </div>
  );
}
