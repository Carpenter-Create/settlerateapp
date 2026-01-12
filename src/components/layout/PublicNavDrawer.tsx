import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
          "absolute left-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          "dark:bg-background",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header - Modal title bar treatment */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
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
            <X className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>

        {/* Menu Items - Deliberate row height and spacing */}
        <nav className="flex flex-col py-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex h-14 items-center justify-between px-5 text-base transition-colors",
                location.pathname === item.href
                  ? "font-medium text-foreground"
                  : "text-foreground/90 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span>{item.name}</span>
              <ChevronRight className="h-5 w-5 text-foreground/50" strokeWidth={2} />
            </Link>
          ))}
        </nav>

        {/* Sign In - Anchored at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-white p-5 dark:bg-background">
          <Link
            to="/auth"
            className="flex h-14 items-center justify-between text-base font-medium text-foreground transition-colors hover:text-foreground/80"
          >
            <span>Sign in</span>
            <ChevronRight className="h-5 w-5 text-foreground/50" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
