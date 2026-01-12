import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AuthShell,
  AuthHeader,
  AuthSegmentedControl,
  AuthForm,
  AuthBodyRegion,
  AuthSecondaryAction,
  AuthSecondaryLink,
  AuthDisclaimer,
  AuthConfirmationState,
  AuthLegalCheckbox,
  AuthEscapeLink,
  AuthSessionBanner,
} from "@/components/auth/AuthShell";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Unified Access Page - PRODUCTION AUTH STANDARD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Single page with two modes controlled by query param: ?mode=signin | ?mode=create
 * 
 * LOCKED BEHAVIOR:
 * - Typography: UI/system font ONLY
 * - Method hierarchy: Password primary, magic link secondary
 * - Error handling: Inline, neutral, factual
 * - Loading states: Button text changes, form disabled
 * - Session handling: Redirect with neutral banner
 * ═══════════════════════════════════════════════════════════════════════════
 */

type AccessMode = "signin" | "create";
type ViewState = "form" | "magic-link-sent" | "confirm-email";

// Inline error state type
interface FieldErrors {
  email?: string;
  password?: string;
  terms?: string;
  general?: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading, isAnonymous, prepareForSignIn } = useAuth();

  // Derive mode from URL query param (default: signin)
  const modeParam = searchParams.get("mode");
  const mode: AccessMode = modeParam === "create" ? "create" : "signin";

  // Check for session expired state from URL
  const sessionExpired = searchParams.get("expired") === "true";

  const [viewState, setViewState] = useState<ViewState>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Redirect if already authenticated (non-anonymous)
  useEffect(() => {
    if (!isLoading && user && !isAnonymous) {
      const from = (location.state as any)?.from?.pathname || "/app/scenarios";
      navigate(from, { replace: true });
    }
  }, [user, isLoading, isAnonymous, navigate, location]);

  // Reset view state and errors when mode changes
  useEffect(() => {
    setViewState("form");
    setPassword("");
    setAgreedToTerms(false);
    setErrors({});
  }, [mode]);

  // Clear field error when user starts typing
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
  };

  const setMode = (newMode: AccessMode) => {
    setSearchParams({ mode: newMode }, { replace: true });
  };

  const clearSessionExpired = () => {
    if (sessionExpired) {
      searchParams.delete("expired");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearSessionExpired();
    setErrors({});

    // Validation
    const newErrors: FieldErrors = {};
    if (!email.trim()) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      newErrors.password = "This field is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
          setErrors({ password: "The email or password is incorrect." });
        } else {
          setErrors({ general: "Unable to sign in. Please try again." });
        }
      }
    } catch {
      setErrors({ general: "Unable to sign in. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    clearSessionExpired();
    setErrors({});

    // Validation
    const newErrors: FieldErrors = {};
    if (!email.trim()) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      newErrors.password = "This field is required.";
    } else if (password.length < 12) {
      newErrors.password = "Password does not meet requirements.";
    }
    if (!agreedToTerms) {
      newErrors.terms = "Agreement required to continue.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
          setErrors({ email: "An account already exists for this email." });
        } else {
          setErrors({ general: "Unable to create account. Please try again." });
        }
      } else {
        setViewState("confirm-email");
      }
    } catch {
      setErrors({ general: "Unable to create account. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    clearSessionExpired();
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: "Enter a valid email address." });
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
        setErrors({ general: "Unable to send sign-in link. Please try again." });
      } else {
        setViewState("magic-link-sent");
      }
    } catch {
      setErrors({ general: "Unable to send sign-in link. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AuthShell>
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  // Magic link sent confirmation
  if (viewState === "magic-link-sent") {
    return (
      <AuthConfirmationState
        title="Check your email"
        body="If an account exists for this email, a sign-in link has been sent."
        actionLabel="Back to sign in"
        onAction={() => {
          setViewState("form");
          setEmail("");
          setPassword("");
          setErrors({});
        }}
      />
    );
  }

  // Email confirmation state (after signup)
  if (viewState === "confirm-email") {
    return (
      <AuthConfirmationState
        title="Confirm your email"
        body="If an account exists for this email, a confirmation link has been sent."
        actionLabel="Back to sign in"
        onAction={() => {
          setMode("signin");
          setViewState("form");
          setPassword("");
          setErrors({});
        }}
      />
    );
  }

  // Button loading text
  const getButtonText = () => {
    if (isSubmitting) {
      return mode === "create" ? "Creating account…" : "Signing in…";
    }
    return mode === "create" ? "Create account" : "Sign in";
  };

  // Main form view
  return (
    <AuthShell>
      {/* Session expired banner */}
      {sessionExpired && (
        <AuthSessionBanner message="Your session has expired. Please sign in again." />
      )}

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

      {/* General error */}
      {errors.general && (
        <p className="auth-error-inline">{errors.general}</p>
      )}

      {/* Body Region — fixed height container for form + actions */}
      <AuthBodyRegion>
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
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="auth-error-inline">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-normal">
                Password
              </Label>
              {/* Forgot password link — hidden via visibility in create mode to preserve layout */}
              <Link
                to="/reset-password"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                style={{ 
                  visibility: mode === "signin" && !isSubmitting ? "visible" : "hidden",
                  pointerEvents: mode === "signin" && !isSubmitting ? "auto" : "none"
                }}
                tabIndex={mode === "signin" && !isSubmitting ? 0 : -1}
                aria-hidden={mode !== "signin"}
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder={mode === "create" ? "At least 12 characters" : ""}
              disabled={isSubmitting}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="auth-error-inline">{errors.password}</p>
            )}
            {/* Password helper — always renders to preserve height, visibility toggles */}
            <p 
              className="text-xs text-muted-foreground"
              style={{ visibility: mode === "create" && !errors.password ? "visible" : "hidden" }}
              aria-hidden={mode !== "create" || !!errors.password}
            >
              At least 12 characters
            </p>
          </div>

          {/* Legal checkbox — always in DOM to preserve layout, visibility toggles */}
          <div
            style={{ 
              visibility: mode === "create" ? "visible" : "hidden",
              pointerEvents: mode === "create" ? "auto" : "none"
            }}
            aria-hidden={mode !== "create"}
          >
            <AuthLegalCheckbox
              checked={agreedToTerms}
              onCheckedChange={(checked) => {
                setAgreedToTerms(checked);
                if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
              }}
              disabled={isSubmitting || mode !== "create"}
            />
            {errors.terms && (
              <p className="auth-error-inline mt-1">{errors.terms}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {getButtonText()}
          </Button>
        </AuthForm>

        {/* Secondary actions — single container, both always rendered */}
        <AuthSecondaryAction>
          {/* Sign in mode: magic link */}
          <span
            style={{ 
              visibility: mode === "signin" ? "visible" : "hidden",
              position: mode === "signin" ? "static" : "absolute",
              pointerEvents: mode === "signin" ? "auto" : "none"
            }}
            aria-hidden={mode !== "signin"}
          >
            <AuthSecondaryLink 
              onClick={handleMagicLink} 
              disabled={isSubmitting || mode !== "signin"}
            >
              Email me a sign-in link
            </AuthSecondaryLink>
          </span>
          {/* Create mode: switch to sign in */}
          <span
            style={{ 
              visibility: mode === "create" ? "visible" : "hidden",
              position: mode === "create" ? "static" : "absolute",
              pointerEvents: mode === "create" ? "auto" : "none"
            }}
            aria-hidden={mode !== "create"}
          >
            <AuthSecondaryLink 
              onClick={() => setMode("signin")} 
              disabled={isSubmitting || mode !== "create"}
            >
              Already have an account? Sign in
            </AuthSecondaryLink>
          </span>
        </AuthSecondaryAction>
      </AuthBodyRegion>

      {/* Website escape link */}
      <AuthEscapeLink />

      {/* Disclaimer */}
      <AuthDisclaimer />
    </AuthShell>
  );
}
