import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Reset Password - Request reset email
 */

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast("Email address required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://app.settlerate.com/reset-password/confirm",
      });

      if (error) {
        toast("Something went wrong. Please try again.");
      } else {
        setEmailSent(true);
      }
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-space-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-normal tracking-tight">
              Check your email
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              If an account exists for{" "}
              <span className="text-foreground">{email}</span>, a password reset
              link has been sent.
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
            Reset password
          </h1>
          <p className="mt-space-2 text-sm text-muted-foreground">
            We'll email you a link to set a new password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-space-4">
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
              "Send reset link"
            )}
          </Button>
        </form>

        {/* Secondary action */}
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
