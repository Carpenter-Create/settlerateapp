# UI_STANDARD.md — SettleRate Application

## Purpose

This document defines structural UI standards for the SettleRate application. It complements COPY_STANDARD.md, which governs language and tone.

The source of truth for all design tokens is `src/index.css`.

---

## Spacing Tokens (Canonical)

All vertical spacing must use CSS custom properties defined in `src/index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--space-section` | 96px | Standard section padding (top/bottom) |
| `--space-section-tight` | 64px | Condensed section padding |
| `--space-card-gap` | 24px | Gap between heading and body text |
| `--space-text-stack` | 12px | Gap between related text elements |

### Rules

- Section spacing **must** use tokens only
- No arbitrary pixel or rem values for section spacing
- Use inline styles with `var(--token-name)` or Tailwind utilities where mapped

---

## Surface System (Canonical)

Surface colors create visual hierarchy without decorative elements:

| Token | CSS Variable | Usage |
|-------|--------------|-------|
| `bg-surface-primary` | `--surface-primary` | Core reading background (warm white) |
| `bg-surface-secondary` | `--surface-secondary` | Structural section breaks |
| `bg-surface-tertiary` | `--surface-tertiary` | Emphasis panels, comparisons |

### Rules

- Background tokens from `src/index.css` are canonical
- Do not introduce new surface semantics without updating the design system
- Use existing Tailwind classes: `bg-background`, `bg-muted`, `bg-card` for app surfaces

---

## Typography (Canonical)

Typography definitions match `src/index.css` exactly:

### Headings

```css
/* h1 - Page titles */
h1 {
  font-family: serif (Libre Baskerville);
  font-size: text-2xl → sm:text-3xl;
  font-weight: normal;
  letter-spacing: tracking-tight;
  color: text-foreground;
}

/* h2 - Section headings */
h2 {
  font-family: serif;
  font-size: text-xl → sm:text-2xl;
  font-weight: normal;
  letter-spacing: tracking-tight;
  color: text-foreground;
}

/* h3 - Subsection headings */
h3 {
  font-family: sans-serif;
  font-size: text-base;
  font-weight: medium;
  color: text-foreground;
}

/* h4 - Minor headings */
h4 {
  font-family: sans-serif;
  font-size: text-sm;
  font-weight: medium;
  color: text-foreground;
}
```

### Body Text

```css
/* p - Body paragraphs */
p {
  font-size: text-sm;
  line-height: leading-relaxed;
  color: text-muted-foreground;
}
```

### Rules

- Do not override heading weights (h1/h2 are `font-normal`, not semibold)
- Serif headings are institutional; do not replace with sans-serif
- Body text uses muted foreground; headlines use full foreground

---

## Component Discipline

### shadcn/ui Components

- Use existing shadcn components without visual drift
- Do not create one-off typography wrappers unless added as a shared component
- Extend components via variants in `components/ui/*`, not inline overrides

### Card Patterns

```css
.card-elevated {
  @apply bg-card rounded border border-border;
}

.card-interactive {
  @apply card-elevated transition-colors duration-150;
}

.card-interactive:hover {
  @apply border-foreground/20;
}
```

### Number Display

```css
.number-display {
  @apply font-mono tabular-nums tracking-tight;
}

.currency-display {
  @apply font-serif text-3xl font-normal tabular-nums text-foreground sm:text-4xl;
}
```

---

## Color Usage

### Rules

- Never use raw color values in components
- Always use semantic tokens: `text-foreground`, `bg-background`, `border-border`, etc.
- All colors must be HSL format in `src/index.css`
- Dark mode support is automatic via CSS variables

---

## Enforcement

These standards apply to all application pages. Any UI that violates these standards does not ship.
