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
 * Auth Page - Institutional, Factual
 * No emotional or consumer language.
 */

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAnonymous, prepareForSignIn } = useAuth();

  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Redirect if already authenticated (non-anonymous)
  useEffect(() => {
    if (!isLoading && user && !isAnonymous) {
      const from = (location.state as any)?.from?.pathname || "/app/scenarios";
      navigate(from, { replace: true });
    }
  }, [user, isLoading, isAnonymous, navigate, location]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast("Email address required.");
      return;
    }

    // Prepare for migration before sign-in
    prepareForSignIn();

    setIsSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: "https://app.settlerate.com/app/scenarios",
        },
      });

      if (error) throw error;
      setEmailSent(true);
    } catch (error: any) {
      toast("Unable to send sign-in link. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-2xl font-normal tracking-tight">
            Link sent
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            If the email address is valid, a sign-in link has been sent to{" "}
            <span className="text-foreground">{email}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Links expire for security.
          </p>
          <button
            onClick={() => {
              setEmailSent(false);
              setEmail("");
            }}
            className="mt-8 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Use a different email
          </button>
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
            Sign in
          </h1>
          <p className="mt-space-2 text-sm text-muted-foreground">
            Receive a secure sign-in link via email.
          </p>
          {isAnonymous && (
            <p className="mt-space-2 text-xs text-muted-foreground/70">
              Scenarios will be saved to your account.
            </p>
          )}
        </div>

        {/* Magic link form */}
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
              disabled={isSending}
              autoComplete="email"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send link"
            )}
          </Button>
        </form>

        {/* Legal */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}