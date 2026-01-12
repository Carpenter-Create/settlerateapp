import { ReactNode, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { PublicNavDrawer } from "./PublicNavDrawer";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Hamburger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            aria-controls="nav-drawer"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Logo (centered) */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
          >
            SettleRate
          </Link>

          {/* Sign in */}
          <Link
            to="/auth"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Navigation Drawer */}
      <PublicNavDrawer isOpen={isMenuOpen} onClose={handleCloseMenu} />

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
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
