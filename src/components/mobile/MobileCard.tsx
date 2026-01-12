/**
 * MobileCard — Standard mobile interaction primitive (LOCKED)
 * 
 * Design Standard:
 * - Full-width, tappable card with subtle elevation
 * - Hierarchy: label (secondary) → metric (primary) → metadata (tertiary)
 * - No right-aligned values on mobile
 * - Chevron affordance for navigation
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
        // Container styling (LOCKED)
        "rounded-[14px] bg-card",
        "border border-border/50",
        "shadow-[0_1px_3px_0_rgb(0_0_0/0.04),0_1px_2px_-1px_rgb(0_0_0/0.04)]",
        // Transitions
        "transition-all duration-150 ease-out",
        // Pressed/hover states (subtle, no ripple)
        onClick && "active:bg-muted/50 active:shadow-none",
        onClick && "hover:border-border hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.05)]",
        // Padding (LOCKED: 16-20px)
        "p-4 sm:p-5",
        // Margin bottom handled by parent spacing
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
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
 * Font: small-medium, regular weight, neutral gray
 */
export function MobileCardLabel({ children, className }: MobileCardLabelProps) {
  return (
    <p className={cn(
      "truncate text-sm text-muted-foreground",
      className
    )}>
      {children}
    </p>
  );
}

/**
 * Card primary metric - dominant element (monthly payment, total, etc.)
 * Font: largest on card, medium weight, near-black
 * Always left-aligned
 */
export function MobileCardMetric({ children, suffix, className }: MobileCardMetricProps) {
  return (
    <p className={cn(
      "mt-1.5 font-serif text-2xl font-normal tracking-tight text-foreground",
      className
    )}>
      {children}
      {suffix && (
        <span className="text-base text-muted-foreground"> {suffix}</span>
      )}
    </p>
  );
}

/**
 * Card metadata - tertiary emphasis (type, term, last updated)
 * Font: small, muted gray, never competes with metric
 */
export function MobileCardMetadata({ children, className }: MobileCardMetadataProps) {
  return (
    <div className={cn(
      "mt-2 flex items-center gap-2 text-xs text-muted-foreground/80",
      className
    )}>
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
