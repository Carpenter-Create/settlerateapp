# COPY_STANDARD.md — SettleRate Application

## Purpose

This document governs language and tone for in-app UI copy, exports, and legal/compliance language within the SettleRate application.

---

## Product Identity (Canonical)

> **SettleRate is a mortgage analysis and comparison tool designed to help users understand the financial implications of different loan scenarios.**

This sentence is authoritative and must be used verbatim wherever SettleRate is defined.

### Regulatory-Safe Version (Footer/Terms/About)

> SettleRate is an independent decision-support platform designed to help users model and understand potential mortgage outcomes. SettleRate does not provide lending services, brokerage services, financial, legal, or tax advice, does not originate, broker, recommend, or refer mortgage products, and does not act as an agent, lender, or marketplace. All calculations and outputs are illustrative, based on user-provided or standardized assumptions, and are intended for informational and comparative purposes only.

---

## Voice

- Neutral
- Institutional
- Analytical
- Calm
- Non-promotional

### Perspective

- The user is the decision-maker
- SettleRate is analytical infrastructure
- Advisors and lenders remain authorities

---

## What SettleRate Is

- A scenario-based mortgage analysis tool
- A comparison interface for understanding tradeoffs
- An assumption-driven modeling system
- Decision-support infrastructure

## What SettleRate Is Not

- A lender
- A broker
- A marketplace
- A recommendation engine
- A forecasting product
- A financial advisor

---

## Language Discipline

### Preferred Verbs and Nouns

Use these terms consistently:

- model
- evaluate
- compare
- surface
- normalize
- outcomes
- assumptions
- structures
- scenario
- context
- illustrative
- comparison

### Forbidden Words

Never use these terms:

- save (as benefit)
- optimize
- best
- smarter
- win
- faster close
- advantage
- personalized
- tailored
- recommended
- FinTech
- forecast
- predict
- you should

---

## Claims Restrictions

- Never promise financial benefit
- Never imply improved approval, rate, or outcome
- Never suggest SettleRate replaces professional judgment
- Never use urgency or scarcity language
- Never use emotional reward framing

---

## UI State Copy

All UI states use neutral, factual language only.

### Approved Patterns

| State | Copy |
|-------|------|
| No scenario present | "No scenario modeled yet." |
| Comparison empty | "Add a scenario to compare outcomes." |
| Export unavailable | "Export available after comparison." |
| Error state | "Unable to calculate with the current inputs." |
| Loading | "Loading…" |
| Success | "Scenario created." / "Changes saved." |

### Forbidden Patterns

- No apology language ("Sorry", "Oops")
- No exclamation points
- No friendliness or encouragement tone
- No celebratory language ("Success!", "Great job!")

---

## Copy by Surface

### UI Copy

- Plain language
- Second person allowed
- Light softening ("about," "helps show")
- Must explain, not persuade

### Export Copy

- Institutional only
- No parentheticals
- No softening language
- Third-person framing

---

## One Governing Rule

> **UI explains.**
> **Exports document.**

If copy violates this, it does not ship.

---

## Tone Enforcement

- No exclamation points
- No conversational filler
- No marketing adjectives
- No encouragement language
- No urgency framing
- No emotional appeals

---

## Implementation Review Checklist

### Calculator UI

- [ ] "Scenario" used consistently
- [ ] Percent-of-income language is neutral
- [ ] Rate language says "illustrative"
- [ ] No advice verbs ("should," "best")

### Exports (PDF)

- [ ] No second person
- [ ] No softening words
- [ ] Clean, factual presentation
- [ ] Matches assumptions shown in UI

---

## Enforcement

These guardrails apply to all in-app copy and must be enforced for all future copy changes. Any copy that violates these standards does not ship.
