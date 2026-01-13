# TYPOGRAPHY STANDARD — SETTLERATE

## PURPOSE

This document defines the canonical typography system for SettleRate.
It establishes where the brand serif font (Libre Baskerville) may be used
and where the body/system font must be used.

---

## CORE PRINCIPLE

**Headings communicate structure (serif). Content communicates facts (body font).**

---

## BRAND SERIF USAGE (Libre Baskerville)

The brand serif font is ONLY used for:

| Element | Example | CSS |
|---------|---------|-----|
| Page H1 titles | "Calculator", "Scenarios", "Comparisons" | `font-serif text-2xl font-normal` |
| Report titles | Scenario name on detail page | `font-serif text-2xl font-normal` |
| Section titles | "Scenario Overview", "Monthly Payment" | `font-serif text-lg font-normal` |
| PDF section headings | "Long-Term Cost Summary" | Serif in jsPDF |

### Constraints

- Never use heavy weights (bold) — use natural/normal weight only
- Never use serif inside:
  - Cards in lists (comparison cards, scenario cards)
  - Table cells (labels or values)
  - Form labels, inputs, helper text
  - Buttons, links, navigation, badges, chips
  - Toast messages and dialogs (except modal title if truly a heading)
  - Metric/value rows

---

## BODY/SYSTEM FONT USAGE (Inter / System Sans)

The body/system font is used for:

| Element | Example |
|---------|---------|
| Card titles in lists | Comparison name in list card |
| Table labels + values | All table content |
| Form labels, inputs, helper text | All form elements |
| Buttons, links, navigation | All interactive elements |
| Badges, chips | Status indicators |
| Toast messages | Notifications |
| Dialog content | Modal body text |
| Metric/value rows | Financial figures |
| Metadata | Dates, IDs, counts |

---

## PDF EXPORT TYPOGRAPHY

| Element | Font | Weight |
|---------|------|--------|
| Report title | Serif (simulated via Helvetica style in jsPDF) | Normal |
| Section headings | System/Helvetica | Normal |
| Table labels | System/Helvetica | Normal |
| Table values | System/Helvetica | Normal |
| Footer | System/Helvetica | Normal |

PDF exports use Helvetica (jsPDF default) for all text to ensure consistent
rendering across all systems. The institutional tone is maintained through
layout and hierarchy, not font variety.

---

## IMPLEMENTATION

### CSS Classes

```css
/* Page headings - brand serif */
h1 {
  @apply font-serif text-2xl font-normal tracking-tight;
}

/* Section headings - can use serif */
h2 {
  @apply font-serif text-xl font-normal tracking-tight;
}

/* Card/list titles - body font only */
.list-card-title {
  @apply text-base font-medium; /* NO font-serif */
}

/* Table cells - body font only */
.table-cell {
  @apply text-sm; /* NO font-serif */
}
```

### Component Rules

1. **PageShell**: Uses `font-serif` for `h1` title
2. **ListCard**: Uses body font for title (NO serif)
3. **Table components**: Uses body font for all content
4. **ComparisonSection**: Uses `font-serif` for section title (`h2`)
5. **MobileSection**: Uses body font for section title (uppercase, smaller)

---

## ENFORCEMENT

- All new pages MUST use PageShell for consistent H1 treatment
- All list cards MUST use ListCard component
- Tables MUST use Table component with standard padding
- No serif font classes in card or table content
- PDF generation MUST use system font for all text

---

## ANTI-PATTERNS

❌ `font-serif` on card titles in lists
❌ `font-serif` on table cells
❌ Heavy/bold weights on serif headings
❌ Serif font on buttons or form elements
❌ Mixing serif and sans in the same paragraph
❌ Serif font in toast notifications

---

This document supersedes all prior typography conventions.
