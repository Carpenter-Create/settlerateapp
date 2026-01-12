import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calculator, FolderOpen, GitCompare, User } from "lucide-react";

const navigation = [
  { name: "Calculator", href: "/app/calculator", icon: Calculator },
  { name: "Scenarios", href: "/app", icon: FolderOpen },
  { name: "Compare", href: "/compare", icon: GitCompare },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="flex h-12 w-full max-w-full items-center justify-between px-4 sm:px-6 lg:container lg:px-8">
        {/* Logo - serif, institutional */}
        <Link to="/app" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-70">
          <span className="font-serif text-lg tracking-tight">SettleRate</span>
        </Link>

        {/* Navigation - minimal */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right section */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            to="/app/settings"
            className={cn(
              "flex h-8 w-8 items-center justify-center transition-colors",
              location.pathname === "/app/settings"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-4 w-4" strokeWidth={1.5} />
            <span className="sr-only">Settings</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
