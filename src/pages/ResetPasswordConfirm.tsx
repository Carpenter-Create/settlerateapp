import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AuthLayout,
  AuthCard,
  AuthHeader,
  AuthForm,
  AuthInput,
  AuthButton,
  AuthErrorBanner,
  AuthConfirmationState,
} from "@/components/auth/AuthLayout";
import { authClasses } from "@/styles/authStandard";

/**
 * Reset Password Confirm - Uses AuthLayout standard
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

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsValidSession(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: FieldErrors = {};
    if (!password) newErrors.password = "This field is required.";
    else if (password.length < 12) newErrors.password = "Password does not meet requirements.";
    if (!confirmPassword) newErrors.confirmPassword = "This field is required.";
    else if (password && confirmPassword !== password) newErrors.confirmPassword = "Passwords do not match.";

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

  if (isValidSession === null) {
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

  if (!isValidSession) {
    return (
      <AuthConfirmationState
        title="This sign-in link has expired."
        body="Please request a new one."
        actionLabel="Request a new link"
        onAction={() => navigate("/reset-password")}
      />
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader title="Set a new password" subtitle="Choose a strong password with at least 12 characters." />
        {errors.general && <AuthErrorBanner message={errors.general} />}
        <AuthForm onSubmit={handleSubmit}>
          <AuthInput
            id="password"
            type="password"
            label="New password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
            placeholder="At least 12 characters"
            disabled={isSubmitting}
            autoComplete="new-password"
            autoFocus
            error={errors.password}
          />
          <AuthInput
            id="confirmPassword"
            type="password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined })); }}
            disabled={isSubmitting}
            autoComplete="new-password"
            error={errors.confirmPassword}
          />
          <AuthButton disabled={isSubmitting}>
            {isSubmitting ? "Updating password…" : "Update password"}
          </AuthButton>
        </AuthForm>
      </AuthCard>
    </AuthLayout>
  );
}
