/**
 * Print Controller Component
 * 
 * Renders printable content in-page and triggers window.print()
 * without opening a new tab. Uses a portal to render content
 * in a dedicated #print-root element.
 */

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface PrintControllerProps {
  /** HTML content to print */
  html: string;
  /** Called when print dialog closes */
  onAfterPrint: () => void;
  /** Whether printing is active */
  isActive: boolean;
}

/**
 * PrintController - In-place print solution (no new tab)
 * 
 * When isActive=true:
 * 1. Renders HTML into #print-root
 * 2. Triggers window.print() after a short delay
 * 3. Calls onAfterPrint when done
 */
export function PrintController({ html, onAfterPrint, isActive }: PrintControllerProps) {
  const handleAfterPrint = useCallback(() => {
    onAfterPrint();
  }, [onAfterPrint]);

  useEffect(() => {
    if (!isActive) return;

    // Add afterprint listener
    window.addEventListener("afterprint", handleAfterPrint);

    // Trigger print after DOM update
    const timer = requestAnimationFrame(() => {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.print();
      }, 100);
    });

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      cancelAnimationFrame(timer);
    };
  }, [isActive, handleAfterPrint]);

  if (!isActive) return null;

  // Get or create the print root element
  let printRoot = document.getElementById("print-root");
  if (!printRoot) {
    printRoot = document.createElement("div");
    printRoot.id = "print-root";
    document.body.appendChild(printRoot);
  }

  return createPortal(
    <div 
      className="print-content"
      dangerouslySetInnerHTML={{ __html: html }} 
    />,
    printRoot
  );
}

/**
 * Hook to manage print state
 */
export function usePrintController() {
  return {
    triggerPrint: (html: string, onComplete: () => void) => {
      // Create temporary print root if needed
      let printRoot = document.getElementById("print-root");
      if (!printRoot) {
        printRoot = document.createElement("div");
        printRoot.id = "print-root";
        document.body.appendChild(printRoot);
      }

      // Create content wrapper
      const wrapper = document.createElement("div");
      wrapper.className = "print-content";
      wrapper.innerHTML = html;
      printRoot.appendChild(wrapper);

      // Handle afterprint
      const cleanup = () => {
        window.removeEventListener("afterprint", cleanup);
        printRoot?.removeChild(wrapper);
        onComplete();
      };
      window.addEventListener("afterprint", cleanup);

      // Trigger print
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
        }, 100);
      });
    },
  };
}
