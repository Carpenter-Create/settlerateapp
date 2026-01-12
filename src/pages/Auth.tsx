import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AuthShell,
  AuthHeader,
  AuthSegmentedControl,
  AuthForm,
  AuthSecondaryAction,
  AuthSecondaryLink,
  AuthDisclaimer,
  AuthConfirmationState,
} from "@/components/auth/AuthShell";

/**
 * Unified Access Page - Sign In / Create Account
 * Single page with two modes controlled by query param: ?mode=signin | ?mode=create
 * 
 * Layout and styling are locked via AuthShell component.
 * Do not add inline spacing overrides.
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
      <AuthConfirmationState
        title="Check your email for a sign-in link."
        body="A link has been sent to"
        email={email}
        actionLabel="Back to sign in"
        onAction={() => {
          setViewState("form");
          setEmail("");
          setPassword("");
        }}
      />
    );
  }

  // Email confirmation state (after signup)
  if (viewState === "confirm-email") {
    return (
      <AuthConfirmationState
        title="Confirm your email"
        body="We sent a confirmation link to"
        email={email}
        actionLabel="Back to sign in"
        onAction={() => {
          setMode("signin");
          setViewState("form");
          setPassword("");
        }}
      />
    );
  }

  // Main form view
  return (
    <AuthShell>
      {/* Header */}
      <AuthHeader
        title={mode === "create" ? "Create account" : "Sign in"}
        subtitle={
          mode === "create"
            ? "Create an account to save your scenarios."
            : "Access your saved scenarios and continue your analysis."
        }
      />

      {/* Mode tabs (segmented control) */}
      <AuthSegmentedControl activeTab={mode} onTabChange={setMode} />

      {/* Form */}
      <AuthForm onSubmit={mode === "create" ? handleCreateAccount : handleSignIn}>
        <div className="space-y-2">
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

        <div className="space-y-2">
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
      </AuthForm>

      {/* Secondary actions */}
      {mode === "signin" && (
        <AuthSecondaryAction>
          <AuthSecondaryLink onClick={handleMagicLink} disabled={isSubmitting}>
            Email me a sign-in link
          </AuthSecondaryLink>
        </AuthSecondaryAction>
      )}
      {mode === "create" && (
        <AuthSecondaryAction>
          <AuthSecondaryLink onClick={() => setMode("signin")}>
            Already have an account? Sign in
          </AuthSecondaryLink>
        </AuthSecondaryAction>
      )}

      {/* Disclaimer */}
      <AuthDisclaimer />
    </AuthShell>
  );
}
