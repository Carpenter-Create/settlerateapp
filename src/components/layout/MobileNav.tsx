import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calculator, FolderOpen, GitCompare, Settings } from "lucide-react";

const navigation = [
  { name: "Calculator", href: "/", icon: Calculator },
  { name: "Scenarios", href: "/scenarios", icon: FolderOpen },
  { name: "Compare", href: "/compare", icon: GitCompare },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
