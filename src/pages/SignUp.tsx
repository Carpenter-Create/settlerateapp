import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Sign Up Page - Create new account
 * Single responsibility: user registration only
 */

export default function SignUp() {
  const navigate = useNavigate();
  const { user, isLoading, isAnonymous, prepareForSignIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Redirect if already authenticated (non-anonymous)
  useEffect(() => {
    if (!isLoading && user && !isAnonymous) {
      navigate("/app/scenarios", { replace: true });
    }
  }, [user, isLoading, isAnonymous, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast("Email and password required.");
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
        setEmailSent(true);
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

  // Email confirmation sent
  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-space-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-normal tracking-tight">
              Check your email to confirm your account
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A confirmation link has been sent to{" "}
              <span className="text-foreground">{email}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Click the link in your email to complete registration.
            </p>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to sign in
            </Link>
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
            Create an account
          </h1>
          <p className="mt-space-2 text-sm text-muted-foreground">
            Save scenarios and access them anytime.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-space-4">
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
              placeholder="At least 12 characters"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        {/* Secondary action */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Already have an account? Sign in
          </Link>
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
