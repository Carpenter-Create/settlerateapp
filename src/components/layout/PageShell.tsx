import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PageShell - Unified page layout primitive
 * 
 * Provides consistent structure for all /app pages:
 * - Title with optional subtitle
 * - Actions area (right-aligned on desktop)
 * - Consistent spacing and typography
 * 
 * USAGE:
 * <PageShell title="Scenarios" subtitle="Saved mortgage models">
 *   {content}
 * </PageShell>
 */

interface PageShellProps {
  /** Page title - uses system font, medium weight */
  title: string;
  /** Optional subtitle - muted, smaller */
  subtitle?: string;
  /** Optional actions rendered in header (right side on desktop) */
  actions?: ReactNode;
  /** Page content */
  children: ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Max width variant */
  maxWidth?: "default" | "narrow" | "wide";
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  className,
  maxWidth = "default",
}: PageShellProps) {
  return (
    <div
      className={cn(
        "space-y-6 md:space-y-8",
        maxWidth === "narrow" && "mx-auto max-w-2xl",
        maxWidth === "wide" && "mx-auto max-w-6xl",
        className
      )}
    >
      {/* Header region */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}

/**
 * PageSection - Content section within a page
 * 
 * Use for grouping related content with an optional title.
 */
interface PageSectionProps {
  /** Optional section title */
  title?: string;
  /** Section content */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

export function PageSection({ title, children, className }: PageSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

/**
 * PageCard - Elevated content card within a section
 * 
 * Consistent styling for content containers.
 */
interface PageCardProps {
  children: ReactNode;
  className?: string;
  /** Padding variant */
  padding?: "default" | "compact" | "none";
}

export function PageCard({ children, className, padding = "default" }: PageCardProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-card",
        padding === "default" && "p-5 sm:p-6",
        padding === "compact" && "p-4",
        padding === "none" && "",
        className
      )}
    >
      {children}
    </div>
  );
}
