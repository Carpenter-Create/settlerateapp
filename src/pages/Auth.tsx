import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildAuthRedirectUrl, resolveAuthOrigin } from "@/lib/authRedirect";
import {
  AuthLayout,
  AuthCard,
  AuthHeader,
  AuthSegmentedControl,
  AuthForm,
  AuthBodyRegion,
  AuthInput,
  AuthButton,
  AuthSecondaryAction,
  AuthSecondaryLink,
  AuthLegalCheckbox,
  AuthSessionBanner,
  AuthErrorBanner,
  AuthConfirmationState,
} from "@/components/auth/AuthLayout";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Unified Access Page - PRODUCTION AUTH STANDARD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Uses AuthLayout + authStandard.ts for all styling.
 * No ad-hoc styling permitted — all tokens come from the standard.
 * 
 * @see /src/styles/AUTH_UI_STANDARD.md
 * ═══════════════════════════════════════════════════════════════════════════
 */

type AccessMode = "signin" | "create";
type ViewState = "form" | "magic-link-sent" | "confirm-email";

const AUTH_REDIRECT_ORIGIN = resolveAuthOrigin(import.meta.env.VITE_APP_ORIGIN);

interface FieldErrors {
  email?: string;
  password?: string;
  terms?: string;
  general?: string;
}

interface AuthLocationState {
  from?: { pathname?: string };
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
      const from = (location.state as AuthLocationState | null)?.from?.pathname || "/app/scenarios";
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

    const newErrors: FieldErrors = {};
    if (!email.trim()) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      newErrors.password = "This field is required.";
    } else if (password.length < 9) {
      newErrors.password = "Password must be at least 9 characters.";
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
          emailRedirectTo: buildAuthRedirectUrl(AUTH_REDIRECT_ORIGIN, "/app/scenarios"),
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
          emailRedirectTo: buildAuthRedirectUrl(AUTH_REDIRECT_ORIGIN, "/app/scenarios"),
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
      <AuthLayout>
        <AuthCard>
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        </AuthCard>
      </AuthLayout>
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
    <AuthLayout>
      <AuthCard>
        {/* Session expired banner */}
        {sessionExpired && (
          <AuthSessionBanner message="Your session has expired. Please sign in again." />
        )}

        {/* Header */}
        <AuthHeader title={mode === "create" ? "Create account" : "Sign in"} />

        {/* Mode tabs */}
        <AuthSegmentedControl activeTab={mode} onTabChange={setMode} />

        {/* General error banner */}
        {errors.general && <AuthErrorBanner message={errors.general} />}

        {/* Body Region */}
        <AuthBodyRegion>
          {/* Form */}
          <AuthForm onSubmit={mode === "create" ? handleCreateAccount : handleSignIn}>
            <AuthInput
              id="email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
              error={errors.email}
            />

            <AuthInput
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder={mode === "create" ? "At least 9 characters" : ""}
              disabled={isSubmitting}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              error={errors.password}
              rightElement={
                <Link
                  to="/reset-password"
                  className="text-xs text-[hsl(220_8%_52%)] transition-colors hover:text-foreground hover:underline hover:underline-offset-2"
                  style={{ 
                    visibility: mode === "signin" && !isSubmitting ? "visible" : "hidden",
                    pointerEvents: mode === "signin" && !isSubmitting ? "auto" : "none"
                  }}
                  tabIndex={mode === "signin" && !isSubmitting ? 0 : -1}
                  aria-hidden={mode !== "signin"}
                >
                  Forgot password?
                </Link>
              }
            />

            {/* Legal checkbox — always in DOM to preserve layout */}
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
                error={errors.terms}
              />
            </div>

            <AuthButton disabled={isSubmitting}>
              {getButtonText()}
            </AuthButton>
          </AuthForm>

          {/* Secondary action — magic link for sign in mode only */}
          <AuthSecondaryAction>
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
          </AuthSecondaryAction>
        </AuthBodyRegion>
      </AuthCard>
    </AuthLayout>
  );
}
