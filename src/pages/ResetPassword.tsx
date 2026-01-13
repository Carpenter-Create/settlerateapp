import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthLayout,
  AuthCard,
  AuthHeader,
  AuthForm,
  AuthInput,
  AuthButton,
  AuthConfirmationState,
} from "@/components/auth/AuthLayout";
import { authClasses } from "@/styles/authStandard";

/**
 * Reset Password - Uses AuthLayout standard
 */
export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (emailSent) {
    return (
      <AuthConfirmationState
        title="Check your email"
        body="If an account exists for this email, a reset link has been sent."
        actionLabel="Back to sign in"
        onAction={() => window.location.href = "/"}
      />
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader title="Reset password" subtitle="Enter your email to receive a reset link." />
        <AuthForm onSubmit={handleSubmit}>
          <AuthInput
            id="email"
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
            placeholder="you@example.com"
            disabled={isSubmitting}
            autoComplete="email"
            autoFocus
            error={error || undefined}
          />
          <AuthButton disabled={isSubmitting}>
            {isSubmitting ? "Sending link…" : "Send reset link"}
          </AuthButton>
        </AuthForm>
        <div className="text-center">
          <Link to="/" className={authClasses.secondaryLink}>Back to sign in</Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
