import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Unified Access Page - Sign In / Create Account
 * Single page with two modes controlled by query param: ?mode=signin | ?mode=create
 */

type AccessMode = "signin" | "create";
type ViewState = "form" | "magic-link-sent" | "confirm-email";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading, isAnonymous, prepareForSignIn } = useAuth();

  // Derive mode from URL query param (default: signin)
  const modeParam = searchParams.get("mode");
  const mode: AccessMode = modeParam === "create" ? "create" : "signin";

  const [viewState, setViewState] = useState<ViewState>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated (non-anonymous)
  useEffect(() => {
    if (!isLoading && user && !isAnonymous) {
      const from = (location.state as any)?.from?.pathname || "/app/scenarios";
      navigate(from, { replace: true });
    }
  }, [user, isLoading, isAnonymous, navigate, location]);

  // Reset view state when mode changes
  useEffect(() => {
    setViewState("form");
    setPassword("");
  }, [mode]);

  const setMode = (newMode: AccessMode) => {
    setSearchParams({ mode: newMode }, { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast("Enter an email address.");
      return;
    }
    if (!password) {
      toast("Enter your password.");
      return;
    }

    prepareForSignIn();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast("Incorrect email or password.");
        } else {
          toast("Something went wrong. Please try again.");
        }
      }
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast("Enter an email address.");
      return;
    }
    if (!password) {
      toast("Enter a password.");
      return;
    }
    if (password.length < 12) {
      toast("Password must be at least 12 characters.");
      return;
    }

    prepareForSignIn();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: "https://app.settlerate.com/app/scenarios",
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast("This email is already registered. Try signing in.");
        } else {
          toast("Something went wrong. Please try again.");
        }
      } else {
        setViewState("confirm-email");
      }
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      toast("Enter an email address.");
      return;
    }

    prepareForSignIn();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: "https://app.settlerate.com/app/scenarios",
        },
      });

      if (error) {
        toast("Something went wrong. Please try again.");
      } else {
        setViewState("magic-link-sent");
      }
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Magic link sent confirmation
  if (viewState === "magic-link-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-space-6">
          <div className="text-center">
            <Link
              to="/"
              className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
            >
              SettleRate
            </Link>
            <h1 className="mt-space-6 font-serif text-2xl font-normal tracking-tight">
              Check your email for a sign-in link.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A link has been sent to{" "}
              <span className="text-foreground">{email}</span>
            </p>
            <button
              onClick={() => {
                setViewState("form");
                setEmail("");
                setPassword("");
              }}
              className="mt-8 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to sign in
            </button>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground/70">
            SettleRate provides analytical tools only and does not provide
            lending, brokerage, legal, tax, or investment advice.
          </p>
        </div>
      </div>
    );
  }

  // Email confirmation state (after signup)
  if (viewState === "confirm-email") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-space-6">
          <div className="text-center">
            <Link
              to="/"
              className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
            >
              SettleRate
            </Link>
            <h1 className="mt-space-6 font-serif text-2xl font-normal tracking-tight">
              Confirm your email
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="text-foreground">{email}</span>
            </p>
            <button
              onClick={() => {
                setMode("signin");
                setViewState("form");
                setPassword("");
              }}
              className="mt-8 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to sign in
            </button>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground/70">
            SettleRate provides analytical tools only and does not provide
            lending, brokerage, legal, tax, or investment advice.
          </p>
        </div>
      </div>
    );
  }

  // Main form view
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-space-6">
        {/* Header */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
          >
            SettleRate
          </Link>
          <h1 className="mt-space-6 font-serif text-2xl font-normal tracking-tight">
            {mode === "create" ? "Create account" : "Sign in"}
          </h1>
          <p className="mt-space-2 text-sm text-muted-foreground">
            {mode === "create"
              ? "Create an account to save your scenarios."
              : "Access your saved scenarios and continue your analysis."}
          </p>
        </div>

        {/* Mode tabs (segmented control) */}
        <div className="flex rounded-lg border border-border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
              mode === "create"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
              mode === "signin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Sign in
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={mode === "create" ? handleCreateAccount : handleSignIn}
          className="space-y-space-4"
        >
          <div className="space-y-space-2">
            <Label htmlFor="email" className="text-sm font-normal">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-space-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-normal">
                Password
              </Label>
              {mode === "signin" && (
                <Link
                  to="/reset-password"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "create" ? "At least 12 characters" : ""}
              disabled={isSubmitting}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
            />
            {mode === "create" && (
              <p className="text-xs text-muted-foreground">At least 12 characters</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "create" ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Secondary actions */}
        <div className="space-y-space-3 text-center">
          {mode === "signin" && (
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={isSubmitting}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Email me a sign-in link
            </button>
          )}
          <div>
            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => setMode("create")}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                New to SettleRate? Create an account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground/70">
          SettleRate provides analytical tools only and does not provide
          lending, brokerage, legal, tax, or investment advice.
        </p>
      </div>
    </div>
  );
}
