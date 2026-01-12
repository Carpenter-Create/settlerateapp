import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

/**
 * 404 Page - Institutional, Factual
 * No emotional language ("Oops", "Sorry").
 */

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: Attempted access to non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-primary px-6">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground/50">
          404
        </p>
        <h1 className="mt-4 font-serif text-2xl font-medium tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-foreground/60">
          The requested path does not exist.
        </p>
        <Link 
          to="/" 
          className="mt-8 inline-block text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          Return to home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
