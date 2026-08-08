# Staging Seed / Synthetic Data Policy

**Authority:** `docs/adr/0008-environment-topology.md` §9  
**Database:** `docs/staging/STAGING_DATABASE.md`

## Rules

1. **No production customer data** in staging without a separate founder
   authorization for a sanitized extract. Default: **forbidden**.
2. Prefer **empty schema + synthetic users** created through normal Auth
   signup / admin bootstrap against the staging project.
3. Catalog rows that come from **git migrations** (Stripe price allowlists,
   entitlement-related seed in migrations) are allowed — they are not
   customer PII.
4. Never copy production `auth.users`, `profiles`, `scenarios`,
   `subscriptions`, `billing`, export objects, or storage blobs into staging.
5. Staging reset = wipe + migrate + synthetic recreate (not partial prod sync).

## Current seed strategy (Epic 7 PR 2)

| Layer | Strategy |
|-------|----------|
| Schema | Full git migration chain to tip |
| Stripe catalog tables | Populated by historical/phase migrations already in git |
| Auth users | None initially; create synthetic testers in PR 5 smoke |
| Scenarios / comparisons | None initially; create via app during smoke |
| Admin | Epic 1 bootstrap tokens against **staging** project only |
| Exports | Generated during smoke into staging `exports` bucket only |

No committed SQL dump of production data. No anonymous prod dump scripts.

## Future deterministic fixtures (optional)

If smoke needs repeatable rows beyond Auth signup, add a **synthetic-only**
seed SQL under `scripts/staging/` with obvious fake emails
(`staging-user-*@example.invalid`) and fixed UUIDs. Such a script must:

- refuse to run unless linked project ref is `gkhbalfpxjtleypbabjo`;
- never accept a production ref;
- remain optional and documented here.

## Email / notifications

Staging must not email real customers. Use synthetic addresses and staging
Auth email settings. Do not configure production SMTP credentials on staging.
