import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AuthShell - LOCKED NON-DRIFTING STANDARD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Single source of truth for auth page structure, typography, and spacing.
 * All auth pages MUST use this shell. Do not inline custom spacing.
 * 
 * LOCKED RULES (do not modify without explicit review):
 * ─────────────────────────────────────────────────────
 * 1. TYPOGRAPHY: UI/system font ONLY. No Source Serif 4 anywhere.
 * 2. METHOD HIERARCHY: Password is primary, magic link is secondary.
 * 3. LEGAL: Checkbox required for account creation.
 * 4. ESCAPE LINK: Website link always visible.
 * 5. TONE: Neutral, administrative. No marketing language.
 * 
 * Spacing and typography are driven by --auth-* tokens in index.css.
 * ═══════════════════════════════════════════════════════════════════════════
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

interface AuthBodyRegionProps {
  children: React.ReactNode;
}

interface AuthSecondaryActionProps {
  children: React.ReactNode;
  className?: string;
}

interface AuthDisclaimerProps {
  text?: string;
}

interface AuthLegalCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

interface AuthSessionBannerProps {
  message: string;
}

// Main shell container — fixed frame architecture for layout stability
// Uses flex with align-start and fixed top padding for pinned position
export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="auth-shell-frame">
      <div className={cn("auth-container", className)}>
        {children}
      </div>
    </div>
  );
}

// Brand + title + subtitle header (UI font only)
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

// Body region — fixed min-height container for form + actions
// Prevents layout collapse when switching between modes
export function AuthBodyRegion({ children }: AuthBodyRegionProps) {
  return (
    <div className="auth-body-region">
      {children}
    </div>
  );
}

// Legal checkbox with Privacy Policy and Terms of Service
export function AuthLegalCheckbox({ checked, onCheckedChange, disabled }: AuthLegalCheckboxProps) {
  return (
    <div className="auth-legal-checkbox">
      <Checkbox
        id="legal-agreement"
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <label htmlFor="legal-agreement" className={disabled ? "opacity-50" : ""}>
        I agree to the{" "}
        <a 
          href="/privacy" 
          target="_blank" 
          rel="noopener noreferrer"
          tabIndex={disabled ? -1 : 0}
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a 
          href="/terms" 
          target="_blank" 
          rel="noopener noreferrer"
          tabIndex={disabled ? -1 : 0}
        >
          Terms of Service
        </a>
        .
      </label>
    </div>
  );
}

// Session expired banner — neutral, non-alarming
export function AuthSessionBanner({ message }: AuthSessionBannerProps) {
  return (
    <div className="auth-session-banner">
      {message}
    </div>
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

// Website escape hatch link
export function AuthEscapeLink() {
  return (
    <a
      href="https://settlerate.com"
      className="auth-escape-link"
    >
      ← Back to SettleRate.com
    </a>
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
      <AuthEscapeLink />
      <AuthDisclaimer />
    </AuthShell>
  );
}
