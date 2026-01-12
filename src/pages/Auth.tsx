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
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

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

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    // Prepare for migration before sign-in
    prepareForSignIn();
    
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "https://app.settlerate.com/app/scenarios",
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast("Sign-in unsuccessful. Try again.");
      setOauthLoading(null);
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
              disabled={isSending || !!oauthLoading}
              autoComplete="email"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSending || !!oauthLoading}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send link"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-space-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isSending || !!oauthLoading}
          >
            {oauthLoading === "google" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Sign in with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("apple")}
            disabled={isSending || !!oauthLoading}
          >
            {oauthLoading === "apple" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            Sign in with Apple
          </Button>

          {/* Dev mode note for Apple */}
          {import.meta.env.DEV && (
            <p className="text-center text-xs text-muted-foreground/60">
              Apple Sign-in requires Service ID configuration in Supabase.
            </p>
          )}
        </div>

        {/* Legal */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}
