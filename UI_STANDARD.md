# UI_STANDARD.md — SettleRate

## Purpose

This document defines structural UI standards that prevent visual and architectural drift across the application. It complements COPY_STANDARD.md, which governs language and tone.

---

## Hero Component Standard

### Rule

Marketing and informational pages **must** use the `HeroStandard` component.

This includes:
- `/how-it-works`
- `/advisors`
- `/our-approach`
- `/for-investors`
- `/pricing`
- Any future marketing or informational pages using the standard hero pattern

### HeroStandard Props

| Prop | Type | Description |
|------|------|-------------|
| `headline` | `string` | Main H1 text |
| `subtitle` | `string \| string[]` | Hero subtitle paragraph(s) |

### Constraints

- **`subtitle` must be `string` or `string[]`. No JSX subtitles.**
- HeroStandard is responsible for paragraph rendering and spacing
- No page-specific typography or spacing wrappers around hero content
- No per-page overrides to hero scale, rhythm, or spacing

### Rationale

A single canonical hero definition prevents visual drift between pages. When switching between marketing pages, the hero scale and rhythm must be identical.

---

## Spacing Tokens

All vertical spacing in marketing sections must use CSS custom properties:

| Token | Usage |
|-------|-------|
| `--space-hero-top` | Hero container top padding |
| `--space-hero-bottom` | Hero container bottom padding |
| `--space-section` | Standard section padding (top/bottom) |
| `--space-card-gap` | Gap between heading and body text |
| `--space-text-stack` | Gap between H1 and subtitle |

Do not use arbitrary pixel or rem values for section spacing.

---

## Typography Standards

### Hero H1

```
font-family: serif (Libre Baskerville)
font-size: text-3xl → sm:text-4xl → lg:text-[2.75rem]
font-weight: medium
letter-spacing: tracking-[-0.02em]
line-height: leading-[1.15]
```

### Hero Subtitle

```
font-size: text-base → sm:text-lg
line-height: leading-[1.7]
color: text-foreground/60
max-width: max-w-2xl
```

### Section Headings (H2)

```
font-family: serif
font-size: text-2xl → sm:text-3xl
font-weight: medium
letter-spacing: tracking-[-0.02em]
line-height: leading-[1.2]
```

---

## Surface Color Alternation

Marketing sections alternate between neutral surface colors:

1. `bg-surface-primary` (#FAFAF8)
2. `bg-surface-secondary` (#F3F3EF)
3. `bg-surface-tertiary` (#ECECE6)

This creates calm, institutional rhythm without decorative elements.

---

## Enforcement

These standards apply to all marketing and informational pages. Any UI that violates these standards does not ship.
