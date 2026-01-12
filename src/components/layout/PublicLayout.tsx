import { ReactNode, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { PublicNavDrawer } from "./PublicNavDrawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PublicLayoutProps {
  children: ReactNode;
}

const primaryNav = [
  { name: "Our Approach", href: "/approach" },
  { name: "How It Works", href: "/how-it-works" },
  { name: "For Advisors", href: "/advisors" },
  { name: "For Investors", href: "/investors" },
];

export function PublicLayout({ children }: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile: Hamburger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            aria-controls="nav-drawer"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Logo */}
          <Link
            to="/"
            className="font-serif text-lg tracking-tight transition-opacity hover:opacity-70 lg:static lg:translate-x-0 absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0"
          >
            SettleRate
          </Link>

          {/* Desktop: Primary Navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {primaryNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Desktop: Pricing */}
            <Link
              to="/pricing"
              className={cn(
                "hidden text-sm transition-colors lg:block",
                location.pathname === "/pricing"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Pricing
            </Link>

            {/* Desktop: Sign in */}
            <Link
              to="/auth"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground lg:block"
            >
              Sign in
            </Link>

            {/* Desktop: Start free button */}
            <Button asChild size="sm" className="hidden lg:inline-flex">
              <Link to="/auth">Start free</Link>
            </Button>

            {/* Mobile: Sign in only */}
            <Link
              to="/auth"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation Drawer (mobile/tablet only) */}
      <PublicNavDrawer isOpen={isMenuOpen} onClose={handleCloseMenu} />

      {/* Main content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Links */}
          <div className="flex items-center justify-center gap-8">
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              to="/contact"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </div>

          {/* Copyright */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} SettleRate. All rights reserved.
          </p>

          {/* Disclaimer */}
          <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] leading-relaxed text-muted-foreground/60">
            SettleRate provides analytical tools to model mortgage-related scenarios. We are not a lender, broker, or financial advisor and do not offer mortgage products or personalized financial advice. Calculations and projections are estimates based on user-provided inputs and third-party data sources and may not reflect actual loan terms. Users should independently verify all information and consult qualified professionals before making financial decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
