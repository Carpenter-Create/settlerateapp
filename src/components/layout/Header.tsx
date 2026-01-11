import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calculator, FolderOpen, GitCompare, User } from "lucide-react";

const navigation = [
  { name: "Calculator", href: "/", icon: Calculator },
  { name: "Scenarios", href: "/scenarios", icon: FolderOpen },
  { name: "Compare", href: "/compare", icon: GitCompare },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 w-full max-w-full items-center justify-between px-4 sm:px-6 lg:container lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">SettleRate</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right section */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/pricing"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Pricing
          </Link>
          <Link
            to="/settings"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
              location.pathname === "/settings"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <User className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
