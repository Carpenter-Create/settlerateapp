import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PublicNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { name: "Our Approach", href: "/approach" },
  { name: "Pricing", href: "/pricing" },
  { name: "For Advisors", href: "/advisors" },
  { name: "Contact", href: "/contact" },
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
];

export function PublicNavDrawer({ isOpen, onClose }: PublicNavDrawerProps) {
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus close button when drawer opens
    closeButtonRef.current?.focus();

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - Full height solid surface */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute left-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          "dark:bg-background",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* ========== ZONE 1: HEADER ========== */}
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <Link
            to="/"
            onClick={onClose}
            className="font-serif text-xl tracking-tight text-foreground transition-opacity hover:opacity-70"
          >
            SettleRate
          </Link>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* ========== ZONE 2: NAVIGATION ========== */}
        <div className="flex-1 overflow-y-auto">
          {/* Context Block */}
          <div className="px-6 pb-4 pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Explore SettleRate
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A neutral framework for understanding mortgage outcomes.
            </p>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col pb-6">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex h-14 items-center justify-between px-6 text-[15px] transition-colors",
                  location.pathname === item.href
                    ? "font-medium text-foreground"
                    : "text-foreground/90 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span>{item.name}</span>
                <ChevronRight className="h-4 w-4 text-foreground/40" strokeWidth={1.75} />
              </Link>
            ))}
          </nav>
        </div>

        {/* ========== ZONE 3: ACTIONS ========== */}
        <div className="shrink-0 bg-white px-6 pb-8 pt-6 dark:bg-background">
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link to="/auth">Start free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
