/**
 * MethodologyPanel - Compact analytical transparency panel
 * 
 * Provides institutional-grade disclosure about calculation methodology.
 * 
 * DESIGN PRINCIPLES:
 * - Informational only, no interactivity beyond expand/collapse
 * - No icons or callouts
 * - Neutral typography on secondary surface
 * - Remembers open/closed state per session
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { METHODOLOGY_COPY } from "@/lib/calculatorCopy";
import { ChevronDown, ChevronUp } from "lucide-react";

const SESSION_KEY = "settlerate_methodology_panel_open";

interface MethodologyPanelProps {
  className?: string;
  /** Force collapsed on mobile by default */
  defaultCollapsed?: boolean;
}

export function MethodologyPanel({ 
  className,
  defaultCollapsed = false 
}: MethodologyPanelProps) {
  const [isOpen, setIsOpen] = useState(() => {
    // Check session storage for remembered state
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored !== null) {
      return stored === "true";
    }
    // Default based on prop
    return !defaultCollapsed;
  });

  // Persist state to session storage
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, String(isOpen));
  }, [isOpen]);

  return (
    <div className={cn("rounded-md bg-muted/50", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-medium text-muted-foreground">
          {METHODOLOGY_COPY.title}
        </span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
        )}
      </button>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ul className="space-y-1.5 px-4 pb-4">
          {METHODOLOGY_COPY.points.map((point, index) => (
            <li 
              key={index}
              className="text-[11px] leading-relaxed text-muted-foreground/80"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
