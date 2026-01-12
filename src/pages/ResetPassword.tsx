import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  AuthDisclaimer,
  AuthEscapeLink,
} from "@/components/auth/AuthShell";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Reset Password - PRODUCTION AUTH STANDARD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Request password reset email flow.
 * Does NOT confirm account existence for security.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://app.settlerate.com/reset-password/confirm",
      });

      if (resetError) {
        setError("Unable to send reset link. Please try again.");
      } else {
        setEmailSent(true);
      }
    } catch {
      setError("Unable to send reset link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation state — does not confirm account existence
  if (emailSent) {
    return (
      <AuthShell>
        <div className="text-center">
          <Link
            to="/"
            className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
          >
            SettleRate
          </Link>
          <h1 className="auth-h1">Check your email</h1>
          <p className="auth-confirmation-body">
            If an account exists for this email, a reset link has been sent.
          </p>
          <Link to="/" className="auth-back-link">
            Back to sign in
          </Link>
        </div>
        <AuthEscapeLink />
        <AuthDisclaimer />
      </AuthShell>
    );
  }

  // Request form
  return (
    <AuthShell>
      {/* Header */}
      <div className="text-center">
        <Link
          to="/"
          className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
        >
          SettleRate
        </Link>
        <h1 className="auth-h1">Reset password</h1>
        <p className="auth-subtitle">
          Enter your email to receive a reset link.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="auth-form">
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
            aria-invalid={!!error}
          />
          {error && (
            <p className="auth-error-inline">{error}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending link…" : "Send reset link"}
        </Button>
      </form>

      {/* Secondary action */}
      <div className="text-center">
        <Link
          to="/"
          className="auth-secondary-link"
        >
          Back to sign in
        </Link>
      </div>

      {/* Website escape link */}
      <AuthEscapeLink />

      {/* Disclaimer */}
      <AuthDisclaimer />
    </AuthShell>
  );
}
