import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calculator, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Calculator", href: "/app/calculator", icon: Calculator },
  { name: "Account", href: "/app/account", icon: User },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar-background md:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b border-sidebar-border px-4">
            <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
              <span className="font-serif text-lg tracking-tight">SettleRate</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navigation.map((item) => {
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
        <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          {/* Mobile logo */}
          <Link to="/app" className="flex items-center gap-2 transition-opacity hover:opacity-70 md:hidden">
            <span className="font-serif text-lg tracking-tight">SettleRate</span>
          </Link>

          {/* Desktop spacer */}
          <div className="hidden md:block" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                  {user?.email?.charAt(0) || "U"}
                </div>
                <span className="hidden text-sm sm:inline-block">
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
        </header>

        {/* Mobile navigation */}
        <nav className="flex items-center gap-1 border-b border-border bg-background px-4 py-2 md:hidden">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
