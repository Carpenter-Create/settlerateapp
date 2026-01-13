# Auth UI Standard

> Single source of truth for authentication page design.
> All auth pages MUST use `AuthLayout` and tokens from `authStandard.ts`.

## Philosophy

- **Calm**: No urgency, no marketing pressure
- **Institutional**: Professional, trustworthy, Mercury-inspired
- **Minimal**: Every element must earn its place

---

## Do / Don't Rules

### Typography (LOCKED)

| Element | Font | Weight | Size | Notes |
|---------|------|--------|------|-------|
| Wordmark ("SettleRate") | Serif (font-serif) | Normal (400) | 1.0625rem | Understated, not promotional |
| Page heading ("Sign in") | Serif (font-serif) | Normal (400) | 1.375rem | Dominant but restrained |
| Subtitle | System/sans-serif | Normal | 0.875rem | Secondary text only |
| Labels, inputs, buttons | System/sans-serif | Medium/Normal | 0.9375rem | All form elements |
| Helper text, links | System/sans-serif | Normal | 0.8125rem | Tertiary text |

**Rules:**
- ✅ Use brand serif ONLY for wordmark and primary headings
- ✅ Use system font for all interactive/form elements
- ✅ Natural font weight (no bolding beyond 500)
- ✅ Neutral dark gray for text (not pure black)
- ❌ Never use serif fonts in form fields or buttons
- ❌ Never use bold weight for emphasis

### Layout

| ✅ Do | ❌ Don't |
|-------|---------|
| Single centered card surface | Multiple cards or surfaces |
| Max width 420px | Full-width forms |
| 40px padding (desktop), 28px (mobile) | Tight or inconsistent padding |
| Consistent vertical spacing | Varying gaps between elements |

### Colors

| ✅ Do | ❌ Don't |
|-------|---------|
| Page background: #F7F8FA | Pure white background |
| Card: pure white with subtle border | Colored or tinted cards |
| Text: near-black (rgba 92%) | Pure black text |
| Button: neutral dark gray | Pure black or colored CTAs |

### Inputs

| ✅ Do | ❌ Don't |
|-------|---------|
| 48px height | Short inputs |
| Neutral border only | Background tints |
| Border darkens on focus | Glow rings or shadows |
| No icons in inputs | Icons or decorations |

### Focus States

| ✅ Do | ❌ Don't |
|-------|---------|
| Border darkens slightly | Glow rings or shadows |
| Use `:focus-visible` | `:focus` for mouse clicks |
| Thin neutral outline (buttons) | Colored or heavy outlines |

### Errors

| ✅ Do | ❌ Don't |
|-------|---------|
| Inline text below field | Toast notifications |
| Small, restrained text | Icons or shake animations |
| Neutral error color | Bright red or alarming |

### Motion

| ✅ Do | ❌ Don't |
|-------|---------|
| 150-200ms transitions | Long or bouncy animations |
| Standard ease-out | Spring or bounce easing |
| Modal: fade + subtle scale (0.98→1) | Slide or complex animations |

---

## Token Reference

### Spacing

```ts
sectionGap: '24px'
fieldGap: '20px'
headerTitleGap: '24px'
containerPadding: { desktop: '40px', mobile: '28px' }
```

### Sizing

```ts
maxWidth: '420px'
inputHeight: '48px'
buttonHeight: '48px'
borderRadius: '8px'
```

### Colors

```ts
pageBg: 'hsl(220 14% 97%)'           // #F7F8FA
cardBg: 'hsl(0 0% 100%)'             // Pure white
cardBorder: 'rgba(15, 23, 42, 0.10)' // Subtle
textPrimary: 'rgba(15, 23, 42, 0.92)'
textSecondary: 'rgba(15, 23, 42, 0.62)'
buttonBg: 'hsl(220 12% 22%)'
```

### Shadow

```ts
cardShadow: '0 4px 24px -4px hsl(220 20% 20% / 0.06), 0 1px 3px 0 hsl(220 20% 20% / 0.03)'
```

---

## Usage Example

```tsx
import { AuthLayout, AuthHeader, AuthCard } from '@/components/auth/AuthLayout';

export default function SignIn() {
  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader title="Sign in" />
        {/* Form content */}
      </AuthCard>
    </AuthLayout>
  );
}
```

---

## Component Structure

```
AuthLayout (full page frame)
├── AuthCard (white surface)
│   ├── AuthHeader (brand + title)
│   ├── AuthSegmentedControl (mode toggle)
│   ├── AuthBodyRegion (form container)
│   │   ├── AuthForm
│   │   │   ├── Fields + Labels
│   │   │   ├── AuthLegalCheckbox
│   │   │   └── Submit Button
│   │   └── AuthSecondaryAction
│   └── AuthSessionBanner (if needed)
└── AuthEscapeLink (outside card)
```

---

## Overlay / Modal Policy

- Backdrop: `rgba(0, 0, 0, 0.40)` — neutral only
- Animation: fade + scale (0.98→1) over 180ms
- Easing: standard `cubic-bezier(0.4, 0, 0.2, 1)`
- No colored tints or blur effects

---

## Toast Close Button (Global)

All toasts must have:
- Transparent background
- 32×32px hit target minimum
- Icon at 40% opacity → 60% on hover
- No background on hover
- Internal padding (never touch edges)
