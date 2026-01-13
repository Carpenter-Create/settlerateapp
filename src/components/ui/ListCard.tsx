/**
 * ListCard — Unified list card component for saved items
 * 
 * Institutional Standard (LOCKED):
 * - Body typography only (no serif/heading styles)
 * - Title: body font, medium/semibold, 2-line clamp
 * - Metadata: body font, regular, muted
 * - Consistent padding: p-4 mobile, p-5 desktop
 * - Chevron affordance for navigation
 * 
 * Usage:
 * - Comparisons list (/app/comparisons)
 * - Scenarios list (/app/scenarios)
 * - Any "saved item" card pattern
 */

import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListCardProps {
  /** Primary title - displayed prominently */
  title: string;
  /** Optional metadata line (date, type, etc.) */
  metadata?: ReactNode;
  /** Click handler for the entire card */
  onClick?: () => void;
  /** Click handler specifically for the title (e.g., rename) */
  onTitleClick?: () => void;
  /** Optional right-side actions (dropdown menus, etc.) */
  actions?: ReactNode;
  /** Show chevron affordance (default: true) */
  showChevron?: boolean;
  /** Additional className for the card container */
  className?: string;
  /** Optional children for custom content below title */
  children?: ReactNode;
}

/**
 * Unified list card for saved items
 * Uses body typography, institutional density
 */
export function ListCard({
  title,
  metadata,
  onClick,
  onTitleClick,
  actions,
  showChevron = true,
  className,
  children,
}: ListCardProps) {
  const handleTitleClick = (e: React.MouseEvent) => {
    if (onTitleClick) {
      e.stopPropagation();
      onTitleClick();
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-[14px] p-4 md:p-5",
        "bg-card border border-border/50",
        "transition-all duration-150 ease-out",
        onClick && "cursor-pointer",
        onClick && "hover:border-border active:bg-muted/50",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Content area */}
        <div className="min-w-0 flex-1">
          {/* Title: body font, medium weight, 2-line clamp */}
          <p
            className={cn(
              "text-base font-medium text-foreground",
              "line-clamp-2",
              onTitleClick && "cursor-pointer hover:text-muted-foreground transition-colors"
            )}
            onClick={handleTitleClick}
          >
            {title}
          </p>

          {/* Optional custom children */}
          {children}

          {/* Metadata: body font, regular, muted, smaller */}
          {metadata && (
            <div className="mt-2 text-sm text-muted-foreground">
              {metadata}
            </div>
          )}
        </div>

        {/* Actions + chevron */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {actions}
          {showChevron && (
            <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>
      </div>
    </div>
  );
}
