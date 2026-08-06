# SettleRate — Application Repository

The authenticated application surface for SettleRate, a mortgage analysis and comparison tool.

## Overview

This repository contains the core product experience for authenticated users. Marketing and public-facing pages are maintained in a separate repository.

## Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (database, auth, edge functions)
- **Payments**: Stripe (subscription management)

## Routing

| Route | Description |
|-------|-------------|
| `/` | Authentication (sign in) |
| `/app/*` | Protected application pages |
| `/admin/*` | Admin-only pages |

**Note**: This repository does not contain marketing pages (`/pricing`, `/terms`, etc.). Those belong in the marketing repository.

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   ├── calculator/  # Mortgage calculator components
│   ├── layout/      # App layout components
│   └── auth/        # Authentication components
├── pages/           # Route pages
│   ├── app/         # Protected app pages
│   └── admin/       # Admin pages
├── hooks/           # Custom React hooks
├── contexts/        # React contexts
├── lib/             # Utility functions
└── integrations/    # External service integrations

docs/                # Project standards and documentation
supabase/
├── functions/       # Edge functions
└── config.toml      # Supabase configuration
```

## Documentation

Standards and guidelines are maintained in the `/docs` folder:

- [APP_SCOPE.md](docs/APP_SCOPE.md) — Repository scope definition
- [COPY_STANDARD.md](docs/COPY_STANDARD.md) — Copy and language guidelines
- [UI_STANDARD.md](docs/UI_STANDARD.md) — UI and design system standards
- [ROUTING_STANDARD.md](docs/ROUTING_STANDARD.md) — Route structure and guards
- [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) — Security and access control
- [ROLES_AND_ENTITLEMENTS.md](docs/ROLES_AND_ENTITLEMENTS.md) — User roles and subscription tiers

## Environment

Authority: [`docs/adr/0002-secrets-and-environment-policy.md`](docs/adr/0002-secrets-and-environment-policy.md).

### Local client setup

The SPA reads public Supabase configuration from Vite environment variables.

1. Copy the template (do not commit your local `.env`):

```bash
cp .env.example .env
```

2. Set the required public client variables in `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project API URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |

These are **public client configuration** (bundled into the browser). Do **not**
put service-role keys, Stripe secrets, or other server secrets in `.env` or
any `VITE_*` variable.

See [`.env.example`](.env.example) for the exact template. `.env` is gitignored.

CI sets the same two public `VITE_*` variables to non-secret placeholders so
lint/tests/build can import the client without a committed `.env`.

### Supabase

This project uses Supabase for:
- User authentication
- Database with Row-Level Security
- Edge Functions for server-side logic

Platform-managed Edge Function env includes `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### Stripe

Subscription management is handled via Stripe:
- Checkout sessions created via Edge Function
- Webhook events sync subscription status to Supabase
- Customer portal for billing management

**Important:** Stripe secret keys and webhook signing secrets are stored as
Supabase Edge Function secrets, never in client code or `.env`.

## Development

This project uses [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) for development.

### Local Development

```bash
# Install dependencies
npm install

# Configure public client env (see Environment above)
cp .env.example .env
# edit .env with your Supabase URL and publishable key

# Start development server (default: http://localhost:8080)
npm run dev
```

## Security

- All user data tables have Row-Level Security enabled
- Admin access requires explicit role assignment
- Entitlements are enforced server-side via Supabase
- See [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for details
- Client env may only contain public `VITE_*` configuration; server secrets
  stay on the Edge / platform side (ADR 0002)

## Deployment

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click Share → Publish.

## License

Proprietary. All rights reserved.
