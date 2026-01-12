# MOBILE_STANDARD.md — SettleRate Application (LOCKED)

**Status:** Permanent  
**Applies to:** All mobile views (≤ 768px)  
**Authority level:** Non-negotiable

---

## Section 1 — Mobile Philosophy

SettleRate mobile is a **decision-support instrument**, not a calculator app.

### Mobile UI must feel:
- Institutional
- Durable
- Calm
- Asset-oriented

### Out of bounds:
- Spreadsheet-like
- Admin-panel-like
- Utility-first
- Visually dense

---

## Section 2 — Core Mobile Rule: Card-First

### Tables Are Forbidden on Mobile

| Forbidden | Required |
|-----------|----------|
| Column headers | Card layout |
| Rows | Stacked cards |
| Right-aligned numeric columns | Left-aligned metrics |
| Spreadsheet metaphors | Object-based UI |

**If data is listed → it is rendered as cards.**

Desktop tables may exist. Mobile tables may not.

---

## Section 3 — Cards Are the Primary Interaction Unit

### Cards represent:
- Scenarios
- Comparisons
- Saved calculations
- Exports
- Advisor handoffs
- Any saved or meaningful user work

### Cards must convey:
- Weight
- Permanence
- Trust

**If something matters, it deserves a card.**

---

## Section 4 — Interaction Discipline

| Rule | Requirement |
|------|-------------|
| Tap target | Entire card is tappable |
| Affordance | One clear tap affordance only (chevron) |
| Actions | No inline edit/delete buttons on card surface |
| Flow | Actions occur on next screen, not inline |

**Cards are objects, not toolbars.**

---

## Section 5 — Visual Discipline

### Allowed
- Neutral palette
- White surfaces
- Subtle elevation
- Generous spacing
- Calm typography

### Not Allowed
- Loud accent colors
- Gamification
- Dense dividers
- Overuse of borders
- "App store" UI tropes

**When in doubt: reduce.**

---

## Section 6 — Navigation Rules (Mobile)

| Rule | Requirement |
|------|-------------|
| Visible items | Maximum 3 primary nav items |
| Default landing | Scenarios |
| Settings location | Behind Account (overflow menu) |
| Density | Avoid "everything visible" navigation |

**Navigation should feel intentional, not comprehensive.**

---

## Section 7 — CSS Tokens (LOCKED)

All mobile tokens are defined in `src/index.css` under the `MOBILE TOKENS` section.

### Page Layout Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--mobile-page-padding` | 16px | Page edge padding |
| `--mobile-section-spacing` | 24px | Between sections |
| `--mobile-element-spacing` | 12px | Between related elements |

**No edge-to-edge text. Ever.**

### Card Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--mobile-card-padding` | 16px | Card internal padding |
| `--mobile-card-padding-lg` | 20px | Larger card padding |
| `--mobile-card-radius` | 14px | Card border radius |
| `--mobile-card-gap` | 12px | Space between cards |
| `--mobile-card-shadow` | subtle | Card elevation |
| `--mobile-card-shadow-hover` | subtle+ | Hover/press state |

**No heavy shadows. No dramatic elevation.**

### Typography Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--mobile-metric-size` | 1.5rem | Primary metric (monthly payment) |
| `--mobile-label-size` | 0.875rem | Labels/titles |
| `--mobile-metadata-size` | 0.75rem | Metadata (type, date) |

### FAB Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--mobile-fab-radius` | 9999px | Pill-shaped button |
| `--mobile-fab-padding-x` | 20px | Horizontal padding |
| `--mobile-fab-padding-y` | 12px | Vertical padding |
| `--mobile-fab-shadow` | elevated | Floating effect |

---

## Section 8 — Typography Hierarchy (Mobile)

### Primary Metric (Most Important)

Used for: Monthly payment, total cost, key financial outputs

| Property | Value |
|----------|-------|
| Font size | Largest on card (`--mobile-metric-size`) |
| Font weight | Medium (not bold-heavy) |
| Color | Near-black (`text-foreground`) |
| Alignment | Left only |

**Never bold-heavy. Never right-aligned.**

### Title / Label

Used for: Scenario names, section identifiers

| Property | Value |
|----------|-------|
| Font size | Small-medium (`--mobile-label-size`) |
| Font weight | Regular |
| Color | Neutral gray (`text-muted-foreground`) |

**This is not the hero.**

### Metadata

Used for: Loan type, term, update timestamps

| Property | Value |
|----------|-------|
| Font size | Small (`--mobile-metadata-size`) |
| Font weight | Regular |
| Color | Muted gray (`text-muted-foreground/80`) |
| Wrapping | May wrap to second line |

**Never competes with the primary metric.**

---

## Section 9 — Alignment Rules

| Rule | Enforcement |
|------|-------------|
| Default alignment | Left |
| Right alignment on mobile | **Disallowed** |
| Number display | Read, not scanned |

**Finance ≠ spreadsheet.**

---

## Section 10 — Component Reference

### MobileCard Components

Located at `src/components/mobile/MobileCard.tsx`

```tsx
import {
  MobileCard,
  MobileCardLabel,
  MobileCardMetric,
  MobileCardMetadata,
  MobileCardDot,
} from "@/components/mobile/MobileCard";

// Standard usage
<MobileCard onClick={() => navigate(...)}>
  <MobileCardLabel>Scenario Name</MobileCardLabel>
  <MobileCardMetric suffix="/ month">$3,375</MobileCardMetric>
  <MobileCardMetadata>
    <span>Refinance</span>
    <MobileCardDot />
    <span>30-yr fixed</span>
  </MobileCardMetadata>
</MobileCard>
```

### Applies to all features:
- Scenarios
- Comparisons
- Calculator summaries
- Exports
- Advisor handoffs
- Any future saved objects

**No one-off styling.**

---

## Section 11 — Regression Prevention

| Directive | Status |
|-----------|--------|
| New mobile patterns | Do not introduce casually |
| Experiments on financial flows | Forbidden |
| List rendering | Use standard card |
| When unsure | Default to card system |

**Mobile consistency > novelty.**

---

## Section 12 — Enforcement

These guardrails and tokens:
- Are **global**
- Are **permanent**
- **Override** local preferences
- **Must be followed** unless explicitly superseded

---

## Bottom Line

> If Rocket Mortgage wouldn't ship it, neither do we.

SettleRate mobile should feel like a **quiet financial instrument**, not an app.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-12 | Initial locked standard |
| 2026-01-12 | Added CSS tokens and guardrails |
