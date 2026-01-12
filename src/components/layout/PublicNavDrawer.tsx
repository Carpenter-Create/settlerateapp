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
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute left-0 top-0 h-full w-full max-w-xs bg-background shadow-lg",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
          <Link
            to="/"
            onClick={onClose}
            className="font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
          >
            SettleRate
          </Link>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col py-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-4 text-base transition-colors",
                location.pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span>{item.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
            </Link>
          ))}
        </nav>

        {/* Sign In at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 p-4">
          <Link
            to="/auth"
            className="flex items-center justify-between py-3 text-base text-foreground transition-colors hover:text-foreground/80"
          >
            <span className="font-medium">Sign in</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
