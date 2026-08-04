# PORTAL UI STANDARD — SETTLERATE

## PURPOSE

The authenticated SettleRate portal is a financial decision-support system.
It must feel authoritative, neutral, and durable at all times.

This is not a marketing surface.
This is not a dashboard.
This is a system of record.

---

## CORE PRINCIPLES

- **Restraint over expressiveness**
- **Structure over decoration**
- **Permanence over speed**
- **Clarity over cleverness**

---

## TYPOGRAPHY

| Element | Treatment |
|---------|-----------|
| Page titles | Medium weight, calm scale, decisive tone |
| Subtitles | Functional context only, never promotional |
| Table headers | Uppercase, small (text-xs), regulatory tone |
| Body text | Consistent, fixed density, no toggles |

**Enforcement:**
- UI font only throughout portal (no serif in interactive elements)
- Serif reserved for exported documents and reading-oriented help text

---

## LAYOUT

- Primary data is presented in **ledger-style surfaces**
- Containers are subtle, squared, and unanimated
- White space is structured, not ambient
- Pages should feel anchored and inspectable

---

## TABLES (SYSTEM DEFAULT)

| Rule | Value |
|------|-------|
| Row height | Fixed, ≈56–60px |
| Vertical gridlines | None |
| Horizontal dividers | Subtle, border-border/50 |
| Header background | Neutral muted (bg-muted/40) |
| Hover state | Background tint only |
| Elevation | None |
| Animation | None |

---

## DATA HIERARCHY

1. **Outcome metrics** — visually prioritized (font-medium, primary color)
2. **Parameters** — secondary (normal weight, muted)
3. **Metadata** — present but subdued (text-muted-foreground)

---

## ACTIONS

- **Primary actions** are deliberate and calm
- **Destructive actions** are never primary styled
- **Creation** feels intentional, not casual
- Button styling: outline or default, rounded-md, no excessive rounding

---

## ICONS & COLOR

- Icons are **functional only**, never decorative
- **No accent color** inside the portal
- Color is reserved for **meaning**, not branding
- Destructive actions use destructive color only

---

## NAVIGATION

- Lists lead to records
- Records lead to detail views
- Detail views support export and review

---

## EXPORTS

Exports must look like something a lender would forward internally without embarrassment.

### Export Structure

1. Title: Scenario Name
2. Snapshot summary (top)
3. Assumptions table
4. Comparison (if applicable)
5. Timestamp + disclaimer footer

### Visual Rules

- White background
- Black / near-black text
- No accent color
- No icons
- Tight margins
- UI font only (serif NOT allowed)

### Language Rules

| Use | Avoid |
|-----|-------|
| "Scenario" | "Calculator" |
| "Assumptions" | "Inputs" |
| "Modeled outcome" | "Estimate" |
| "Decision support" | "Tool" |

---

## COMPARISONS

Comparisons are not marketing moments. They are analytical surfaces.

### Comparison Layout

- Side-by-side ledger columns
- One scenario is visually primary
- Differences are called out subtly (not highlighted loudly)

### Copy Discipline

| Use | Avoid |
|-----|-------|
| "Difference" | "Savings" |
| "Change in payment" | "You save" |
| "Modeled outcome" | "Results" |

Comparisons should feel like a spreadsheet done right, not a sales pitch.

---

## ADMIN RATE LOCK VIEW

When an admin locks rates for review workflows, the UI should remain institutional and non-directive.

### Header

- Scenario name
- Client name (if applicable)
- Last updated timestamp
- Modeled purpose (Purchase / Refinance)

### Content Sections

1. Scenario Summary
2. Assumptions (clearly labeled as client-provided)
3. Comparison logic (if present)
4. Notes / context

### Actions

- Export
- Download assumptions
- Request revision (future)

**No editing by default** — reinforces neutrality.

---

## ENFORCEMENT

Any deviation from this standard requires a deliberate design decision.
Defaults are not acceptable.

This document supersedes all prior UI conventions for the authenticated portal.
