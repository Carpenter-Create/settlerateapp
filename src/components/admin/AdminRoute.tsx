import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Protected route that only allows admin users.
 * Server-side RLS enforces the actual security - this is UX only.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading: authLoading, isAnonymous } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();

  const isLoading = authLoading || adminLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated or anonymous
  if (!user || isAnonymous) {
    return <Navigate to="/" replace />;
  }

  // Authenticated but not admin
  if (!isAdmin) {
    return <Navigate to="/app/scenarios" replace />;
  }

  return <>{children}</>;
}
