import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ProtectedRoute - Session-aware route guard
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles:
 * - Redirect to auth when not authenticated
 * - Session expiration detection (user was logged in, now isn't)
 * - Preserves intended destination for post-auth redirect
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isAnonymous } = useAuth();
  const location = useLocation();
  
  // Track if user was previously authenticated to detect session expiration
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (user && !isAnonymous) {
      wasAuthenticatedRef.current = true;
    }
  }, [user, isAnonymous]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  // Not authenticated - redirect to auth
  // If user was previously authenticated, add expired flag
  if (!user || isAnonymous) {
    const wasAuthenticated = wasAuthenticatedRef.current;
    const authPath = wasAuthenticated ? "/?expired=true" : "/";
    
    return <Navigate to={authPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
