# UI STANDARD — SETTLERATE

## Purpose

This document defines the unified design system for SettleRate.
All pages, components, and surfaces must conform to these standards.

**Philosophy**: Institutional, calm, high-trust, modern.
**Not**: Consumer-flashy, marketing-forward, or decorative.

---

## Design Tokens

### Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--space-section` | 96px | Between major page sections |
| `--space-section-tight` | 64px | Tighter section breaks |
| `--space-card-gap` | 24px | Between cards/blocks |
| `--space-text-stack` | 12px | Text element spacing |

**Rules:**
- Use only these tokens for section spacing
- Never use arbitrary pixel values like `47px` or `13px`
- Prefer `space-y-6` (24px) and `space-y-8` (32px) for Tailwind

### Surface System

| Token | Usage |
|-------|-------|
| `bg-background` | Page backgrounds |
| `bg-card` | Elevated cards and surfaces |
| `bg-muted` | Subtle backgrounds, table headers |
| `bg-muted/40` | Very subtle tints |

### Typography

| Element | Style |
|---------|-------|
| Page titles | `text-xl sm:text-2xl font-medium tracking-tight` |
| Section headers | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Body text | `text-sm text-muted-foreground` |
| Values | `text-sm font-medium tabular-nums` |
| Large values | `text-lg font-medium tabular-nums` |

**Rules:**
- Use system/sans font for all UI text
- Serif (`font-serif`) only for brand wordmark and select headlines
- Never use serif inside cards, tables, or interactive elements
- Values should be `font-medium`, not `font-semibold` or `font-bold`

### Controls

| Token | Value | Usage |
|-------|-------|-------|
| `--control-h` | 40px | Standard input/button height |
| Input height | `h-10` | Default inputs |
| Button height | `h-10` | Default buttons |

### Radii

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 2px | Subtle rounding |
| `rounded-md` | 4px | Default buttons/inputs |
| `rounded-lg` | 6px | Cards |

**Rules:**
- Use `rounded-sm` for institutional surfaces (tables, cards)
- Never use `rounded-full` except for avatars/pills
- Keep rounding minimal and consistent

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-subtle` | Very light | Default cards |
| `shadow-elevated` | Slightly more | Modals, dropdowns |

**Rules:**
- Shadows should be barely visible
- No sharp drop shadows
- No colored shadows

---

## Component Discipline

### Using shadcn/ui

- Do not override component internals inline
- Extend via variants in the component file
- Use design tokens, not arbitrary colors

### Card Pattern

```tsx
// Correct
<div className="rounded-sm border border-border bg-card p-5 sm:p-6">

// Wrong - arbitrary values, wrong tokens
<div className="rounded-xl shadow-lg bg-white p-8">
```

### Table Pattern

| Property | Value |
|----------|-------|
| Header background | `bg-muted/40` |
| Header text | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Row height | 56-60px (`h-14`) |
| Cell padding | `p-4` (16px) |
| Hover state | `hover:bg-muted/30` |
| Borders | `border-border/50` between rows |

### Button Hierarchy

1. **Primary**: `bg-primary text-primary-foreground` - One per view
2. **Outline**: `variant="outline"` - Secondary actions
3. **Ghost**: `variant="ghost"` - Tertiary/menu actions
4. **Destructive**: `variant="destructive"` - Delete only

---

## Page Layout

### PageShell Component

All /app pages must use PageShell:

```tsx
import { PageShell } from "@/components/layout/PageShell";

export default function MyPage() {
  return (
    <PageShell
      title="Page Title"
      subtitle="Optional description"
      actions={<Button>Action</Button>}
    >
      {/* Content */}
    </PageShell>
  );
}
```

### Spacing Rules

| Context | Desktop | Mobile |
|---------|---------|--------|
| Page gutter | 24px (`px-6`) | 16px (`px-4`) |
| Card padding | 24px (`p-6`) | 20px (`p-5`) |
| Table cell | 16px (`p-4`) | 16px (`p-4`) |
| Section gap | 32px (`space-y-8`) | 24px (`space-y-6`) |

---

## Color Policy

### Allowed

- Semantic tokens only: `text-foreground`, `bg-background`, `border-border`, etc.
- HSL format in CSS variables
- Opacity modifiers: `bg-muted/40`, `border-border/60`

### Forbidden

- Raw hex/rgb values in components: `bg-[#F7F8FA]`
- Pure black/white unless semantic: `text-black`, `bg-white`
- Colored accents inside the portal (reserve for meaning)

---

## States

### Focus

- Inputs: Border darkens on focus, no glow ring
- Buttons: Subtle outline on `:focus-visible` only
- Use `:focus-visible` not `:focus` (mouse click won't show ring)

### Error

- Inline text below field
- Color: `text-destructive`
- Small size: `text-xs` or `text-sm`
- No icons, no shake animations

### Loading

- Use Skeleton components for loading states
- Spinners should be subtle, same color as text
- Never show blank pages

---

## Modal/Dialog

- One modal surface (no stacked modals)
- Backdrop: `bg-black/40` (neutral, ~40% opacity)
- Animation: fade + slight scale (0.98→1) over ~160ms
- No bouncy easing

---

## Toast

- Position: top-right desktop, bottom mobile
- Close button: 32×32px hit target, inset from edges
- Copy: One line when possible
- No alarm colors unless error

---

## Anti-Patterns (Don't)

- ❌ Serif fonts in cards, tables, or interactive elements
- ❌ Pure black text or backgrounds
- ❌ Loud shadows or glowing focus rings
- ❌ Marketing language ("Save big!", "Best option!")
- ❌ Colored tints on backdrops
- ❌ Heavy borders or dividers
- ❌ Animation beyond subtle transitions
- ❌ Arbitrary Tailwind values outside tokens

---

## Enforcement

1. All new components must use tokens from this system
2. Page-level inline styles are forbidden (use PageShell + primitives)
3. Color usage must go through semantic tokens
4. Review this document before creating new UI

This document supersedes all prior styling conventions.
