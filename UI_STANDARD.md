# UI_STANDARD.md — SettleRate

## Purpose

This document defines structural UI standards that prevent visual and architectural drift across the application. It complements COPY_STANDARD.md, which governs language and tone.

---

## Spacing Tokens

All vertical spacing must use CSS custom properties:

| Token | Usage |
|-------|-------|
| `--space-section` | Standard section padding (top/bottom) |
| `--space-card-gap` | Gap between heading and body text |

Do not use arbitrary pixel or rem values for section spacing.

---

## Typography Standards

### Page Headings (H1)

```
font-size: text-2xl
font-weight: semibold
letter-spacing: tracking-tight
```

### Section Headings (H2)

```
font-family: serif
font-size: text-lg
font-weight: medium
```

---

## Surface Colors

App surfaces use the semantic background tokens:

- `bg-background` - Primary app background
- `bg-muted` - Subdued surfaces
- `bg-card` - Elevated card surfaces

---

## Enforcement

These standards apply to all app pages. Any UI that violates these standards does not ship.
