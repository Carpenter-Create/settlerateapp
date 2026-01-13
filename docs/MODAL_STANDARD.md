# Modal Standard

Global UI law for all modals in SettleRate. Non-negotiable.

---

## Philosophy

- **Modals are transactional, not explanatory.**
- UI affordances do the explaining.
- If copy is not strictly required to complete the action, remove it.

Benchmarks: Stripe Dashboard, Mercury, Apple system dialogs.

---

## Structure

### A. Title (Required)

- 1 short noun phrase
- No verbs
- No punctuation

**Examples:**
- Export
- Delete scenario
- Rename comparison
- Remove account

---

### B. Body Copy (Optional, Rare)

Only include if the action is **destructive**, **irreversible**, or **legally sensitive**.

**Rules:**
- Max: 1 sentence
- Plain language
- No marketing language
- No instructions

**Allowed:**
- "This action cannot be undone."
- "Changes apply immediately."

**Disallowed:**
- "Use this to…"
- "This allows you to…"
- "Download a lender-ready PDF…"
- Any explanatory paragraphs

---

### C. Actions (Required)

**Primary action:**
- Verb + object
- 2–3 words max

**Examples:**
- Download PDF
- Save
- Delete
- Rename

**Secondary action (optional):**
- Short noun or verb
- No helper text

**Examples:**
- Cancel
- Print view

---

### D. Subtext (Globally Disallowed)

- No button subtext
- No helper descriptions under buttons
- No instructional copy under buttons

Buttons must stand alone.

---

## Close Behavior

- Top-right "×" required on all non-destructive modals
- Adequate hit area on mobile (min 44×44px touch target)
- No visual crowding near edges
- Escape key closes modal (desktop)

---

## Mobile Rules

- Modal width: inset with safe margins
- No edge-touching text
- Buttons stacked vertically
- Primary action always first

---

## Copy Prohibitions (Hard Rules)

Never use in modals:
- "Download a lender-ready…"
- "Use this to…"
- "This will allow you to…"
- Marketing language
- Explanatory paragraphs
- Any form of instruction beyond the minimum required for destructive actions

---

## Enforcement

This standard applies to:
- Export modals
- Delete confirmations
- Rename dialogs
- Guided flows
- All future features

**All user-facing modals must comply. No exceptions.**
