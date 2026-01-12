import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * AuthShell - Brand-locked authentication page layout
 * 
 * Single source of truth for auth page structure, typography, and spacing.
 * All auth pages MUST use this shell. Do not inline custom spacing.
 * 
 * Spacing and typography are driven by --auth-* tokens in index.css.
 */

interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

interface AuthSegmentedControlProps {
  activeTab: "create" | "signin";
  onTabChange: (tab: "create" | "signin") => void;
}

interface AuthFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

interface AuthSecondaryActionProps {
  children: React.ReactNode;
  className?: string;
}

interface AuthDisclaimerProps {
  text?: string;
}

// Main shell container
export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className={cn("auth-container", className)}>
        {children}
      </div>
    </div>
  );
}

// Brand + title + subtitle header
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center">
      <Link
        to="/"
        className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
      >
        SettleRate
      </Link>
      <h1 className="auth-h1">{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>
    </div>
  );
}

// Mode tabs (Create account / Sign in)
export function AuthSegmentedControl({ activeTab, onTabChange }: AuthSegmentedControlProps) {
  return (
    <div className="auth-segmented-control">
      <button
        type="button"
        onClick={() => onTabChange("create")}
        className={cn(
          "auth-tab",
          activeTab === "create" && "auth-tab-active"
        )}
      >
        Create account
      </button>
      <button
        type="button"
        onClick={() => onTabChange("signin")}
        className={cn(
          "auth-tab",
          activeTab === "signin" && "auth-tab-active"
        )}
      >
        Sign in
      </button>
    </div>
  );
}

// Form wrapper with correct spacing
export function AuthForm({ children, onSubmit }: AuthFormProps) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      {children}
    </form>
  );
}

// Secondary action container (magic link, "already have account" etc.)
export function AuthSecondaryAction({ children, className }: AuthSecondaryActionProps) {
  return (
    <div className={cn("auth-secondary-action", className)}>
      {children}
    </div>
  );
}

// Reusable secondary link button style
export function AuthSecondaryLink({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="auth-secondary-link"
    >
      {children}
    </button>
  );
}

// Footer disclaimer
export function AuthDisclaimer({ text }: AuthDisclaimerProps) {
  return (
    <p className="auth-disclaimer">
      {text || "SettleRate provides analytical tools only and does not provide lending, brokerage, legal, tax, or investment advice."}
    </p>
  );
}

// Confirmation state layout (email sent, confirm email, etc.)
export function AuthConfirmationState({
  title,
  body,
  email,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  email?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <AuthShell>
      <div className="text-center">
        <Link
          to="/"
          className="inline-block font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
        >
          SettleRate
        </Link>
        <h1 className="auth-h1">{title}</h1>
        <p className="auth-confirmation-body">
          {body}
          {email && (
            <>
              {" "}
              <span className="text-foreground">{email}</span>
            </>
          )}
        </p>
        <button onClick={onAction} className="auth-back-link">
          {actionLabel}
        </button>
      </div>
      <AuthDisclaimer />
    </AuthShell>
  );
}
