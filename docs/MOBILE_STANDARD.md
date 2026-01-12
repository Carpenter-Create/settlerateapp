# MOBILE_STANDARD.md — SettleRate Application (LOCKED)

## Purpose

This document defines the **permanent, non-negotiable** mobile design standards for SettleRate. These standards match the quality bar of Rocket Mortgage, Fundrise, and Mercury.

**Mobile UI must never regress to table-based, admin-style, or spreadsheet metaphors.**

---

## Section 1 — Global Mobile Design Principles

Applies to all mobile views (≤ 768px).

### 1.1 Mobile Is Card-First, Not Table-First

- Tables are **explicitly forbidden** on mobile
- Any list of saved, computed, or user-generated objects must render as cards
- Desktop table layouts may remain unchanged

### 1.2 Cards Are the Core Interaction Primitive

Cards represent:
- Scenarios
- Comparisons
- Saved calculations
- Exports
- Advisor-ready handoffs
- Any "saved work"

Cards must convey **weight, permanence, and trust**.

### 1.3 Visual Tone (Global)

| Attribute | Requirement |
|-----------|-------------|
| Palette | Calm, neutral |
| Colors | No playful colors, no loud accents |
| Gamification | Forbidden |
| Dividers | Prefer spacing over lines |
| Shadows | Minimal elevation, never aggressive |

**Everything should feel: Institutional, Durable, Long-term trustworthy**

---

## Section 2 — Standard Card Component

Use `src/components/mobile/MobileCard.tsx` everywhere.

### Card Container (LOCKED)

| Property | Value |
|----------|-------|
| Width | 100% |
| Border radius | 14–16px |
| Background | white (bg-card) |
| Shadow | subtle (1–2dp equivalent) |
| Padding | 16–20px |
| Margin bottom | 12–16px (via parent spacing) |
| Interaction | Entire card is tappable |

### Pressed State

- Slight background darkening OR slight elevation reduction
- **No ripple effects**

### Card Typography Hierarchy (LOCKED)

```
┌─────────────────────────────────────────────────┐
│ Label (secondary)                           [>] │
│ $3,375 / month (PRIMARY METRIC)                 │
│ Refinance • 30-yr fixed • Updated Jan 9         │
└─────────────────────────────────────────────────┘
```

| Line | Example | Size | Weight | Color |
|------|---------|------|--------|-------|
| Label | "440 Talbot Refi 1" | small-medium | regular | neutral gray |
| Metric | "$3,375 / month" | largest | medium | near-black |
| Metadata | "Refinance • 30-yr" | small | regular | muted gray |

**Right-aligned values are NOT ALLOWED on mobile.**

### Tap Affordance

Each card must signal interactivity via:
- Chevron icon (default)
- Subtle pressed state
- Entire card acting as a button

**No inline "Edit" or "Delete" buttons on the card surface.**

---

## Section 3 — Scenarios Page (Mobile)

### Replace Table with Cards

On mobile:
- Remove column headers
- Remove row-based layout
- Render saved scenarios using `MobileCard`

Desktop behavior remains unchanged.

### Primary Action: New Scenario

| Property | Value |
|----------|-------|
| Type | Floating action button |
| Position | bottom-right |
| Label | "+ New scenario" |
| Behavior | Persistent while scrolling |
| Style | Minimal, neutral |

---

## Section 4 — Mobile Navigation Standards

### Top Navigation Simplification

- No more than **3 primary nav items** visible
- Scenarios is default landing
- Settings lives behind Account (overflow menu)
- Avoid admin-panel density

**Navigation must feel intentional, not exhaustive.**

---

## Section 5 — Future Features (Forward-Compatibility)

These standards apply automatically to:

- Comparison views
- Calculator results summaries
- Saved exports
- Advisor-ready handoffs
- Any future "saved object"

**If a feature introduces a list → it uses cards. No exceptions.**

---

## Section 6 — Enforcement

- Treat these standards as **global UI law**
- Do not introduce alternate mobile patterns
- Do not experiment visually without explicit instruction
- If unsure, default to the card system

---

## Component Reference

### MobileCard Components

```tsx
import {
  MobileCard,
  MobileCardLabel,
  MobileCardMetric,
  MobileCardMetadata,
  MobileCardDot,
} from "@/components/mobile/MobileCard";

// Usage
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

---

## Outcome Expectation

After implementation, SettleRate mobile should feel:

- Comparable to Rocket Mortgage loan summaries
- Comparable to Fundrise saved investments
- Calm, premium, and deliberate
- Like a **financial instrument**, not a calculator

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-12 | Initial locked standard |
