import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AuthShell,
  AuthDisclaimer,
  AuthEscapeLink,
} from "@/components/auth/AuthShell";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Reset Password Confirm - PRODUCTION AUTH STANDARD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Set new password after clicking recovery link.
 * Validates session, enforces password requirements.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function ResetPasswordConfirm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: FieldErrors = {};
    if (!password) {
      newErrors.password = "This field is required.";
    } else if (password.length < 12) {
      newErrors.password = "Password does not meet requirements.";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "This field is required.";
    } else if (password && confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrors({ general: "Unable to update password. Please request a new reset link." });
      } else {
        toast("Password updated.");
        navigate("/app/scenarios", { replace: true });
      }
    } catch {
      setErrors({ general: "Unable to update password. Please request a new reset link." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <AuthShell>
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <AuthShell>
        <div className="text-center">
          <Link
            to="/"
            className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
          >
            SettleRate
          </Link>
          <h1 className="auth-h1">This sign-in link has expired.</h1>
          <p className="auth-confirmation-body">
            Please request a new one.
          </p>
          <Link to="/reset-password" className="auth-back-link">
            Request a new link
          </Link>
        </div>
        <AuthEscapeLink />
        <AuthDisclaimer />
      </AuthShell>
    );
  }

  // Password reset form
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
        <h1 className="auth-h1">Set a new password</h1>
        <p className="auth-subtitle">
          Choose a strong password with at least 12 characters.
        </p>
      </div>

      {/* General error */}
      {errors.general && (
        <p className="auth-error-inline text-center">{errors.general}</p>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-normal">
            New password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="At least 12 characters"
            disabled={isSubmitting}
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="auth-error-inline">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-normal">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
            disabled={isSubmitting}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="auth-error-inline">{errors.confirmPassword}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating password…" : "Update password"}
        </Button>
      </form>

      {/* Website escape link */}
      <AuthEscapeLink />

      {/* Disclaimer */}
      <AuthDisclaimer />
    </AuthShell>
  );
}
