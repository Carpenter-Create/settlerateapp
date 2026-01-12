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

### Supabase

This project is connected to Supabase for:
- User authentication (email, OAuth)
- Database with Row-Level Security
- Edge functions for server-side logic

Project ID: `vpcxzbaxhpucvevnkalo`

### Stripe

Subscription management is handled via Stripe:
- Checkout sessions created via edge function
- Webhook events sync subscription status to Supabase
- Customer portal for billing management

**Important**: Stripe secret keys are stored as edge function secrets, never in client code.

## Development

This project uses [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) for development.

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Security

- All user data tables have Row-Level Security enabled
- Admin access requires explicit role assignment
- Entitlements are enforced server-side via Supabase
- See [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for details

## Deployment

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click Share → Publish.

## License

Proprietary. All rights reserved.
