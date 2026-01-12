import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calculator, User, Settings, LogOut, FolderOpen, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
}

// Desktop navigation (full list)
const desktopNavigation = [
  { name: "Scenarios", href: "/app/scenarios", icon: FolderOpen },
  { name: "Calculator", href: "/app/calculator", icon: Calculator },
  { name: "Account", href: "/app/account", icon: User },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

// Mobile navigation structure for hamburger menu
const mobilePrimaryNav = [
  { name: "Scenarios", href: "/app/scenarios", icon: FolderOpen },
  { name: "Calculator", href: "/app/calculator", icon: Calculator },
];

const mobileSecondaryNav = [
  { name: "Account", href: "/app/account", icon: User },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate("/");
  };

  const handleMobileNavClick = (href: string) => {
    setMobileMenuOpen(false);
    navigate(href);
  };

  // Extract user display name from email
  const userDisplayName = user?.email?.split("@")[0] || "User";

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar-background md:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b border-sidebar-border px-4">
            <Link to="/app/scenarios" className="flex items-center gap-2 transition-opacity hover:opacity-70">
              <span className="font-serif text-lg tracking-tight">SettleRate</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {desktopNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.5} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between bg-background px-4 sm:px-6 md:border-b md:border-border">
          {/* Mobile: Logo left, Hamburger right */}
          {isMobile ? (
            <>
              <Link to="/app/scenarios" className="flex items-center transition-opacity hover:opacity-70">
                <span className="font-serif text-lg tracking-tight">SettleRate</span>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-foreground"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </>
          ) : (
            <>
              {/* Desktop spacer */}
              <div />
              {/* Desktop user menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                      {user?.email?.charAt(0) || "U"}
                    </div>
                    <span className="text-sm">
                      {user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/app/account" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/app/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </header>

        {/* Mobile Navigation Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="right" className="w-full max-w-sm border-l-0 p-0" hideCloseButton>
            <div className="flex h-full flex-col">
              {/* Header with close button */}
              <div className="flex h-14 items-center justify-between px-4">
                <span className="font-serif text-lg tracking-tight">SettleRate</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mobile-menu-close h-11 w-11 text-foreground outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:bg-transparent"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </div>

              {/* Identity Block */}
              <div className="border-b border-border px-6 py-5">
                <p className="text-sm font-medium text-foreground">{userDisplayName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{user?.email}</p>
              </div>

              {/* Primary Navigation */}
              <nav className="flex-1 px-3 py-4">
                <div className="space-y-0.5">
                  {mobilePrimaryNav.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleMobileNavClick(item.href)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors outline-none focus:outline-none focus-visible:outline-none",
                          isActive
                            ? "bg-muted/40 text-foreground"
                            : "text-muted-foreground active:bg-muted/30"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground/70" />
                        )}
                        <item.icon className="h-4 w-4" strokeWidth={1.5} />
                        {item.name}
                      </button>
                    );
                  })}
                </div>

                {/* Secondary Navigation */}
                <div className="mt-6 border-t border-border pt-4">
                  <div className="space-y-0.5">
                    {mobileSecondaryNav.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <button
                          key={item.name}
                          onClick={() => handleMobileNavClick(item.href)}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors outline-none focus:outline-none focus-visible:outline-none",
                            isActive
                              ? "bg-muted/40 text-foreground"
                              : "text-muted-foreground active:bg-muted/30"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground/70" />
                          )}
                          <item.icon className="h-4 w-4" strokeWidth={1.5} />
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </nav>

              {/* Sign Out - Isolated at bottom */}
              <div className="border-t border-border p-4">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-muted-foreground transition-colors outline-none focus:outline-none focus-visible:outline-none active:bg-muted/30"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            </div>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          </SheetContent>
        </Sheet>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}