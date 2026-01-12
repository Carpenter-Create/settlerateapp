import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Reset Password Confirm - Set new password after clicking recovery link
 */

export default function ResetPasswordConfirm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // User should have a session from clicking the recovery link
      setIsValidSession(!!session);
    };
    
    checkSession();

    // Listen for auth state changes (recovery link creates a session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast("Both password fields are required.");
      return;
    }

    if (password.length < 6) {
      toast("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        toast("Something went wrong. Please try again.");
      } else {
        toast("Password updated.");
        navigate("/app/scenarios", { replace: true });
      }
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-space-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-normal tracking-tight">
              Invalid or expired link
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              This password reset link is no longer valid. Please request a new
              one.
            </p>
          </div>

          <div className="text-center">
            <Link
              to="/reset-password"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Request new link
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
            Set new password
          </h1>
          <p className="mt-space-2 text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-space-4">
          <div className="space-y-space-2">
            <Label htmlFor="password" className="text-sm font-normal">
              New password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={isSubmitting}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="space-y-space-2">
            <Label htmlFor="confirmPassword" className="text-sm font-normal">
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Update password"
            )}
          </Button>
        </form>

        {/* Disclaimer */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground/70">
          SettleRate provides analytical tools only and does not provide
          lending, brokerage, legal, tax, or investment advice.
        </p>
      </div>
    </div>
  );
}
