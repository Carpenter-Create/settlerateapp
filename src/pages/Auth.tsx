import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Auth Page - Email+Password primary, Magic Link secondary
 */

type AuthMode = "signin" | "signup" | "magic-link" | "magic-link-sent";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAnonymous, prepareForSignIn } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast("Email and password required.");
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast("Email and password required.");
      return;
    }

    if (password.length < 6) {
      toast("Password must be at least 6 characters.");
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
        toast("Check your email to confirm your account.");
        setMode("signin");
        setPassword("");
      }
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast("Email address required.");
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
        setMode("magic-link-sent");
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
  if (mode === "magic-link-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-2xl font-normal tracking-tight">
            Check your email
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            A sign-in link has been sent to{" "}
            <span className="text-foreground">{email}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Links expire for security.
          </p>
          <button
            onClick={() => {
              setMode("signin");
              setEmail("");
              setPassword("");
            }}
            className="mt-8 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Magic link form
  if (mode === "magic-link") {
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
              Sign in with email link
            </h1>
            <p className="mt-space-2 text-sm text-muted-foreground">
              Receive a secure sign-in link via email.
            </p>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-space-4">
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send link"
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setMode("signin")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sign in / Sign up form
  const isSignUp = mode === "signup";

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
            {isSignUp ? "Create account" : "Sign in"}
          </h1>
          {isAnonymous && !isSignUp && (
            <p className="mt-space-2 text-xs text-muted-foreground/70">
              Scenarios will be saved to your account.
            </p>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={isSignUp ? handleSignUp : handleSignIn}
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
            <Label htmlFor="password" className="text-sm font-normal">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "At least 6 characters" : ""}
              disabled={isSubmitting}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSignUp ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Secondary actions */}
        <div className="space-y-space-3 text-center">
          {!isSignUp && (
            <button
              onClick={() => setMode("magic-link")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Email me a sign-in link
            </button>
          )}
          <div>
            <button
              onClick={() => {
                setMode(isSignUp ? "signin" : "signup");
                setPassword("");
              }}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {isSignUp ? "Already have an account? Sign in" : "Create account"}
            </button>
          </div>
        </div>

        {/* Legal */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}
