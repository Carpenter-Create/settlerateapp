/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTH UI STANDARD - Single Source of Truth
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * All auth pages and components MUST import from this file.
 * No page-level ad-hoc styling is permitted.
 * 
 * @see /src/styles/AUTH_UI_STANDARD.md for documentation
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Core design tokens for auth UI
 * Values match CSS custom properties in index.css
 */
export const authTokens = {
  // Layout
  maxWidth: '420px',
  containerPadding: {
    desktop: '40px',
    mobile: '28px',
  },
  borderRadius: '8px',
  
  // Spacing
  sectionGap: '24px',
  fieldGap: '20px',
  headerTitleGap: '24px',
  secondaryGap: '16px',
  escapeGap: '20px',
  
  // Sizing
  inputHeight: '48px',
  buttonHeight: '48px',
  bodyMinHeight: '360px',
  
  // Colors (HSL values for Tailwind compatibility)
  colors: {
    pageBg: 'hsl(220 14% 97%)',          // #F7F8FA equivalent
    cardBg: 'hsl(0 0% 100%)',            // Pure white
    cardBorder: 'rgba(15, 23, 42, 0.10)', // Subtle neutral
    textPrimary: 'rgba(15, 23, 42, 0.92)',
    textSecondary: 'rgba(15, 23, 42, 0.62)',
    textMuted: 'hsl(220 8% 55%)',
    inputBorder: 'hsl(220 10% 85%)',
    inputBorderFocus: 'hsl(220 10% 65%)',
    buttonBg: 'hsl(220 12% 22%)',
    buttonBgHover: 'hsl(220 12% 28%)',
    buttonBgDisabled: 'hsl(220 8% 72%)',
  },
  
  // Shadow
  cardShadow: '0 4px 24px -4px hsl(220 20% 20% / 0.06), 0 1px 3px 0 hsl(220 20% 20% / 0.03)',
  
  // Typography
  typography: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h1Size: '1.375rem',
    h1Weight: '500',
    subtitleSize: '0.875rem',
    bodySize: '0.9375rem',
    smallSize: '0.8125rem',
    fineprintSize: '0.75rem',
    letterSpacing: '-0.01em',
  },
} as const;

/**
 * Motion tokens for animations
 * Minimal, institutional motion language
 */
export const motionTokens = {
  // Durations
  fast: '100ms',
  normal: '150ms',
  slow: '200ms',
  
  // Easing - standard ease-out only, no bouncy effects
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Modal/overlay animation
  modal: {
    duration: '180ms',
    scaleFrom: '0.98',
    scaleTo: '1',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Backdrop
  backdrop: {
    opacity: '0.40',
    color: 'rgba(0, 0, 0, 0.40)',
  },
} as const;

/**
 * Focus ring policy
 * Subtle border darken, no glow rings
 */
export const focusPolicy = {
  // Inputs: border darkens on focus, no shadow/glow
  input: {
    borderColor: 'hsl(220 10% 65%)',
    boxShadow: 'none',
    outline: 'none',
  },
  
  // Buttons: thin neutral outline on focus-visible only
  button: {
    outline: '2px solid hsl(220 10% 70%)',
    outlineOffset: '2px',
  },
  
  // Links: underline on focus-visible
  link: {
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
} as const;

/**
 * Error styling policy
 * Inline, minimal, no icons
 */
export const errorPolicy = {
  // Field-level errors
  field: {
    fontSize: '0.8125rem',
    color: 'hsl(0 50% 48%)',
    marginTop: '6px',
  },
  
  // Form-level banner (inside card)
  banner: {
    padding: '12px 16px',
    background: 'hsl(0 50% 97%)',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: 'hsl(0 50% 38%)',
  },
} as const;

/**
 * Tailwind class compositions for auth components
 * Use these instead of inline class strings
 */
export const authClasses = {
  // Page frame - full viewport, centered
  frame: 'min-h-screen flex flex-col items-center justify-center px-4 py-8',
  frameBackground: 'bg-[hsl(220_14%_97%)]',
  
  // Container wrapper
  wrapper: 'w-full flex flex-col items-center',
  
  // Card surface
  card: [
    'w-full',
    'flex flex-col',
    'bg-white',
    'border border-[rgba(15,23,42,0.10)]',
    'rounded-lg',
    'shadow-[0_4px_24px_-4px_hsl(220_20%_20%/0.06),0_1px_3px_0_hsl(220_20%_20%/0.03)]',
  ].join(' '),
  cardPadding: 'p-10 sm:p-10 p-7',
  
  // Typography
  title: [
    'font-sans',
    'text-[1.375rem]',
    'font-medium',
    'tracking-tight',
    'text-[hsl(220_12%_18%)]',
    'text-center',
  ].join(' '),
  
  subtitle: [
    'font-sans',
    'text-sm',
    'text-[hsl(220_8%_52%)]',
    'text-center',
    'mt-2',
  ].join(' '),
  
  // Brand link
  brandLink: [
    'inline-block',
    'font-sans',
    'text-base',
    'font-medium',
    'tracking-tight',
    'text-[hsl(220_8%_52%)]',
    'transition-opacity',
    'hover:opacity-70',
  ].join(' '),
  
  // Form elements
  form: 'flex flex-col gap-5',
  
  fieldLabel: [
    'font-sans',
    'text-sm',
    'font-normal',
    'text-[hsl(220_12%_25%)]',
  ].join(' '),
  
  input: [
    'h-12',
    'px-3',
    'bg-white',
    'border border-[hsl(220_10%_85%)]',
    'rounded-md',
    'text-[0.9375rem]',
    'transition-colors duration-150',
    'placeholder:text-[hsl(220_8%_62%)]',
    // Focus: border darkens, no glow
    'focus:border-[hsl(220_10%_65%)]',
    'focus:outline-none',
    'focus:ring-0',
  ].join(' '),
  
  button: [
    'h-12',
    'w-full',
    'bg-[hsl(220_12%_22%)]',
    'text-white',
    'rounded-md',
    'text-[0.9375rem]',
    'font-medium',
    'transition-colors duration-150',
    'hover:bg-[hsl(220_12%_28%)]',
    'disabled:bg-[hsl(220_8%_72%)]',
    'disabled:cursor-not-allowed',
    // Focus-visible only
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    'focus-visible:outline-[hsl(220_10%_70%)]',
  ].join(' '),
  
  // Segmented control
  segmentedControl: [
    'flex',
    'p-1',
    'rounded-lg',
    'bg-[hsl(220_14%_95%)]',
    'border border-[hsl(220_10%_90%)]',
  ].join(' '),
  
  segmentedTab: [
    'flex-1',
    'py-2.5 px-3.5',
    'rounded-md',
    'border-none',
    'bg-transparent',
    'font-sans',
    'text-sm',
    'font-normal',
    'text-[hsl(220_8%_50%)]',
    'cursor-pointer',
    'transition-colors duration-150',
    'hover:text-[hsl(220_10%_35%)]',
  ].join(' '),
  
  segmentedTabActive: [
    'bg-white',
    'border border-[hsl(220_10%_86%)]',
    'text-[hsl(220_12%_18%)]',
    'font-medium',
    'shadow-[0_1px_2px_hsl(220_20%_20%/0.04)]',
  ].join(' '),
  
  // Error states
  errorInline: [
    'font-sans',
    'text-[0.8125rem]',
    'text-[hsl(0_50%_48%)]',
    'mt-1.5',
  ].join(' '),
  
  errorBanner: [
    'p-3 px-4',
    'bg-[hsl(0_50%_97%)]',
    'rounded-md',
    'text-sm',
    'text-[hsl(0_50%_38%)]',
  ].join(' '),
  
  // Secondary actions
  secondaryAction: 'text-center min-h-[1.5rem]',
  
  secondaryLink: [
    'font-sans',
    'text-[0.8125rem]',
    'text-[hsl(220_8%_52%)]',
    'transition-colors duration-150',
    'hover:text-[hsl(220_12%_25%)]',
    'hover:underline hover:underline-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  
  // Escape link (outside card)
  escapeContainer: 'w-full text-center mt-5',
  escapeLink: [
    'inline-block',
    'font-sans',
    'text-[0.8125rem]',
    'text-[hsl(220_8%_55%)]',
    'transition-colors duration-150',
    'hover:text-[hsl(220_10%_40%)]',
  ].join(' '),
  
  // Legal checkbox
  legalCheckbox: 'flex items-start gap-3 mt-2',
  legalLabel: [
    'font-sans',
    'text-[0.8125rem]',
    'leading-relaxed',
    'text-[hsl(220_8%_52%)]',
  ].join(' '),
  legalLink: [
    'text-[hsl(220_8%_52%)]',
    'underline underline-offset-2',
    'transition-colors duration-150',
    'hover:text-[hsl(220_12%_25%)]',
  ].join(' '),
  
  // Session banner
  sessionBanner: [
    'p-3 px-4',
    'bg-[hsl(40_60%_96%)]',
    'border border-[hsl(40_50%_85%)]',
    'rounded-md',
    'text-sm',
    'text-[hsl(40_50%_30%)]',
    'text-center',
  ].join(' '),
  
  // Confirmation state
  confirmationBody: [
    'font-sans',
    'text-sm',
    'leading-relaxed',
    'text-[hsl(220_8%_52%)]',
    'mt-3',
  ].join(' '),
  
  backLink: [
    'inline-block',
    'mt-6',
    'font-sans',
    'text-sm',
    'text-[hsl(220_8%_52%)]',
    'transition-colors duration-150',
    'hover:text-[hsl(220_12%_25%)]',
    'hover:underline hover:underline-offset-2',
  ].join(' '),
} as const;

/**
 * Helper to compose class names
 */
export function authCn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Layout max-width constraint
 */
export const AUTH_MAX_WIDTH = '420px';

/**
 * Body region min-height to prevent layout shifts
 */
export const AUTH_BODY_MIN_HEIGHT = '360px';
