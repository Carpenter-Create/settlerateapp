/**
 * MobileCard — Standard mobile interaction primitive (LOCKED)
 * 
 * Design Standard (docs/MOBILE_STANDARD.md):
 * - Full-width, tappable card with subtle elevation
 * - Hierarchy: label (secondary) → metric (primary) → metadata (tertiary)
 * - No right-aligned values on mobile
 * - Chevron affordance for navigation
 * 
 * CSS Tokens (src/index.css):
 * - --mobile-card-padding / --mobile-card-padding-lg
 * - --mobile-card-radius
 * - --mobile-card-shadow / --mobile-card-shadow-hover
 * - --mobile-metric-size / --mobile-label-size / --mobile-metadata-size
 * 
 * Usage:
 * - Scenarios, Comparisons, Exports, Saved calculations
 * - Any "saved object" list on mobile
 * 
 * DO NOT introduce alternate mobile patterns.
 */

import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileCardProps {
  /** Click handler for the entire card */
  onClick?: () => void;
  /** Optional right-side actions (dropdown menus, etc.) */
  actions?: ReactNode;
  /** Show chevron affordance (default: true) */
  showChevron?: boolean;
  /** Additional className for the card container */
  className?: string;
  children: ReactNode;
}

interface MobileCardLabelProps {
  children: ReactNode;
  className?: string;
}

interface MobileCardMetricProps {
  children: ReactNode;
  suffix?: string;
  className?: string;
}

interface MobileCardMetadataProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card container - tappable with subtle elevation
 * Uses CSS tokens from index.css for consistency
 */
export function MobileCard({ 
  onClick, 
  actions, 
  showChevron = true, 
  className,
  children 
}: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative w-full",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        borderRadius: "var(--mobile-card-radius)",
        padding: "var(--mobile-card-padding)",
        boxShadow: "var(--mobile-card-shadow)",
      }}
    >
      {/* Apply bg/border via Tailwind for theme support */}
      <div 
        className={cn(
          "absolute inset-0 bg-card border border-border/50 transition-all duration-150 ease-out",
          onClick && "group-active:bg-muted/50",
          onClick && "group-hover:border-border"
        )}
        style={{ borderRadius: "var(--mobile-card-radius)" }}
      />
      
      <div className="relative flex items-start justify-between gap-3">
        {/* Content area */}
        <div className="min-w-0 flex-1">
          {children}
        </div>

        {/* Actions + chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          {showChevron && (
            <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Card label - secondary emphasis (scenario name, title)
 * Font: --mobile-label-size, regular weight, neutral gray
 */
export function MobileCardLabel({ children, className }: MobileCardLabelProps) {
  return (
    <p 
      className={cn("truncate text-muted-foreground", className)}
      style={{ fontSize: "var(--mobile-label-size)" }}
    >
      {children}
    </p>
  );
}

/**
 * Card primary metric - dominant element (monthly payment, total, etc.)
 * Font: --mobile-metric-size, medium weight, near-black
 * Always left-aligned (right-alignment forbidden on mobile)
 */
export function MobileCardMetric({ children, suffix, className }: MobileCardMetricProps) {
  return (
    <p 
      className={cn(
        "mt-1.5 font-serif font-normal tracking-tight text-foreground",
        className
      )}
      style={{ fontSize: "var(--mobile-metric-size)" }}
    >
      {children}
      {suffix && (
        <span 
          className="text-muted-foreground" 
          style={{ fontSize: "var(--mobile-label-size)", marginLeft: "0.25rem" }}
        >
          {suffix}
        </span>
      )}
    </p>
  );
}

/**
 * Card metadata - tertiary emphasis (type, term, last updated)
 * Font: --mobile-metadata-size, muted gray, never competes with metric
 */
export function MobileCardMetadata({ children, className }: MobileCardMetadataProps) {
  return (
    <div 
      className={cn("mt-2 flex items-center gap-2 text-muted-foreground/80", className)}
      style={{ fontSize: "var(--mobile-metadata-size)" }}
    >
      {children}
    </div>
  );
}

/**
 * Metadata separator dot
 */
export function MobileCardDot() {
  return <span className="text-muted-foreground/40">•</span>;
}
