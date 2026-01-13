import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { authClasses, authCn, AUTH_MAX_WIDTH, AUTH_BODY_MIN_HEIGHT } from "@/styles/authStandard";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTH LAYOUT - Institutional Standard
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Reusable layout for all auth pages.
 * Imports tokens from authStandard.ts — no ad-hoc styling permitted.
 * 
 * @see /src/styles/AUTH_UI_STANDARD.md
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// AuthLayout - Full page frame with centered card
// ─────────────────────────────────────────────────────────────────────────────

interface AuthLayoutProps {
  children: React.ReactNode;
  showEscapeLink?: boolean;
  className?: string;
}

export function AuthLayout({ 
  children, 
  showEscapeLink = true,
  className 
}: AuthLayoutProps) {
  return (
    <div className={authCn(authClasses.frame, authClasses.frameBackground, className)}>
      <div 
        className={authClasses.wrapper}
        style={{ maxWidth: AUTH_MAX_WIDTH }}
      >
        {children}
        {showEscapeLink && <AuthEscapeLink />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthCard - White card surface
// ─────────────────────────────────────────────────────────────────────────────

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div 
      className={cn(
        authClasses.card,
        "p-7 sm:p-10",
        "gap-6",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthHeader - Brand + title + optional subtitle
// ─────────────────────────────────────────────────────────────────────────────

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showBrand?: boolean;
}

export function AuthHeader({ title, subtitle, showBrand = true }: AuthHeaderProps) {
  return (
    <div className="text-center">
      {showBrand && (
        <Link to="/" className={authClasses.brandLink}>
          SettleRate
        </Link>
      )}
      <h1 className={cn(authClasses.title, showBrand && "mt-6")}>{title}</h1>
      {subtitle && <p className={authClasses.subtitle}>{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthSegmentedControl - Mode toggle (Create / Sign in)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSegmentedControlProps {
  activeTab: "create" | "signin";
  onTabChange: (tab: "create" | "signin") => void;
}

export function AuthSegmentedControl({ activeTab, onTabChange }: AuthSegmentedControlProps) {
  return (
    <div className={authClasses.segmentedControl}>
      <button
        type="button"
        onClick={() => onTabChange("create")}
        className={authCn(
          authClasses.segmentedTab,
          activeTab === "create" && authClasses.segmentedTabActive
        )}
      >
        Create account
      </button>
      <button
        type="button"
        onClick={() => onTabChange("signin")}
        className={authCn(
          authClasses.segmentedTab,
          activeTab === "signin" && authClasses.segmentedTabActive
        )}
      >
        Sign in
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthBodyRegion - Fixed height container to prevent layout shifts
// ─────────────────────────────────────────────────────────────────────────────

interface AuthBodyRegionProps {
  children: React.ReactNode;
}

export function AuthBodyRegion({ children }: AuthBodyRegionProps) {
  return (
    <div 
      className="flex flex-col gap-6"
      style={{ minHeight: AUTH_BODY_MIN_HEIGHT }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthForm - Form wrapper with consistent spacing
// ─────────────────────────────────────────────────────────────────────────────

interface AuthFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

export function AuthForm({ children, onSubmit }: AuthFormProps) {
  return (
    <form onSubmit={onSubmit} className={authClasses.form}>
      {children}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthInput - Styled input following standard
// ─────────────────────────────────────────────────────────────────────────────

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function AuthInput({ 
  label, 
  error, 
  rightElement,
  id,
  className,
  ...props 
}: AuthInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={authClasses.fieldLabel}>
          {label}
        </label>
        {rightElement}
      </div>
      <input
        id={id}
        className={cn(
          "w-full",
          authClasses.input,
          error && "border-[hsl(0_50%_70%)]",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className={authClasses.errorInline}>{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthButton - Primary submit button
// ─────────────────────────────────────────────────────────────────────────────

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AuthButton({ children, className, ...props }: AuthButtonProps) {
  return (
    <button 
      type="submit" 
      className={cn(authClasses.button, "mt-2", className)} 
      {...props}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthLegalCheckbox - Terms agreement
// ─────────────────────────────────────────────────────────────────────────────

interface AuthLegalCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}

export function AuthLegalCheckbox({ 
  checked, 
  onCheckedChange, 
  disabled,
  error 
}: AuthLegalCheckboxProps) {
  return (
    <div>
      <div className={authClasses.legalCheckbox}>
        <Checkbox
          id="legal-agreement"
          checked={checked}
          onCheckedChange={(val) => onCheckedChange(val === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <label 
          htmlFor="legal-agreement" 
          className={cn(authClasses.legalLabel, disabled && "opacity-50")}
        >
          I agree to the{" "}
          <a 
            href="/privacy" 
            target="_blank" 
            rel="noopener noreferrer"
            className={authClasses.legalLink}
            tabIndex={disabled ? -1 : 0}
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a 
            href="/terms" 
            target="_blank" 
            rel="noopener noreferrer"
            className={authClasses.legalLink}
            tabIndex={disabled ? -1 : 0}
          >
            Terms of Service
          </a>
          .
        </label>
      </div>
      {error && <p className={cn(authClasses.errorInline, "mt-1")}>{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthSessionBanner - Session expired notification
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSessionBannerProps {
  message: string;
}

export function AuthSessionBanner({ message }: AuthSessionBannerProps) {
  return (
    <div className={authClasses.sessionBanner}>
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthSecondaryAction - Container for secondary links
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSecondaryActionProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthSecondaryAction({ children, className }: AuthSecondaryActionProps) {
  return (
    <div className={cn(authClasses.secondaryAction, className)}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthSecondaryLink - Styled secondary action button
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSecondaryLinkProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function AuthSecondaryLink({ onClick, disabled, children }: AuthSecondaryLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={authClasses.secondaryLink}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthEscapeLink - Link back to marketing site (outside card)
// ─────────────────────────────────────────────────────────────────────────────

export function AuthEscapeLink() {
  return (
    <div className={authClasses.escapeContainer}>
      <a href="https://settlerate.com" className={authClasses.escapeLink}>
        ← Back to SettleRate.com
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthErrorBanner - Form-level error inside card
// ─────────────────────────────────────────────────────────────────────────────

interface AuthErrorBannerProps {
  message: string;
}

export function AuthErrorBanner({ message }: AuthErrorBannerProps) {
  return (
    <div className={authClasses.errorBanner}>
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthConfirmationState - Email sent / confirm email view
// ─────────────────────────────────────────────────────────────────────────────

interface AuthConfirmationStateProps {
  title: string;
  body: string;
  email?: string;
  actionLabel: string;
  onAction: () => void;
}

export function AuthConfirmationState({
  title,
  body,
  email,
  actionLabel,
  onAction,
}: AuthConfirmationStateProps) {
  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center">
          <Link to="/" className={authClasses.brandLink}>
            SettleRate
          </Link>
          <h1 className={cn(authClasses.title, "mt-6")}>{title}</h1>
          <p className={authClasses.confirmationBody}>
            {body}
            {email && (
              <>
                {" "}
                <span className="text-foreground font-medium">{email}</span>
              </>
            )}
          </p>
          <button onClick={onAction} className={authClasses.backLink}>
            {actionLabel}
          </button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
