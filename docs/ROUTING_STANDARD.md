# ROUTING_STANDARD.md — SettleRate Application

## Purpose

This document defines the routing structure for the SettleRate application.

---

## Route Structure

| Route Pattern | Component | Access | Description |
|---------------|-----------|--------|-------------|
| `/` | `Auth` | Public | Authentication entry point |
| `/app` | Redirect | Protected | Redirects to `/app/scenarios` |
| `/app/scenarios` | `ScenariosIndex` | Protected | Scenario list (ledger view) |
| `/app/scenarios/:id` | `ScenarioDetail` | Protected | Scenario detail view |
| `/app/comparisons` | `ComparisonsIndex` | Protected + Pro | Comparison workspace (list + create) |
| `/app/comparisons/:id` | `ComparisonDetail` | Protected + Pro | Saved comparison view |
| `/app/calculator` | `Calculator` | Protected | Mortgage calculator |
| `/app/account` | `Account` | Protected | Subscription and billing |
| `/app/settings` | `AppSettings` | Protected | User settings |
| `/admin/*` | Admin pages | Admin only | Administrative functions |
| `*` | `NotFound` | Public | 404 fallback |

---

## Access Levels

### Public Routes

Routes accessible without authentication:

- `/` — Auth page (redirects to `/app` if already authenticated)
- `*` — 404 page

### Protected Routes

Routes requiring authentication via `ProtectedRoute` wrapper:

- `/app/*` — All application routes

Protected routes redirect unauthenticated users to `/`.

### Admin Routes

Routes requiring admin role via `AdminRoute` wrapper:

- `/admin/*` — All admin routes

Admin routes verify role via `has_role(auth.uid(), 'admin')`.

---

## Route Guards

### ProtectedRoute

```tsx
<ProtectedRoute>
  <AppLayout>
    <Component />
  </AppLayout>
</ProtectedRoute>
```

Behavior:
- Checks for authenticated user
- Redirects to `/` if not authenticated
- Allows anonymous users (they can use the app but data won't persist)

### AdminRoute

```tsx
<AdminRoute>
  <Component />
</AdminRoute>
```

Behavior:
- Checks for authenticated user with admin role
- Redirects to `/app` if authenticated but not admin
- Redirects to `/` if not authenticated

---

## Prohibited Routes

The following routes must **not** exist in this repository:

| Route | Reason |
|-------|--------|
| `/pricing` | Marketing page |
| `/how-it-works` | Marketing page |
| `/terms` | Marketing page |
| `/privacy` | Marketing page |
| `/contact` | Marketing page |
| `/approach` | Marketing page |
| `/advisors` | Marketing page |
| `/investors` | Marketing page |
| `/documentation` | Marketing page |
| `/regulatory` | Marketing page |

These routes belong in the marketing repository.

---

## Navigation Structure

### Header Navigation (Authenticated)

| Label | Route | Icon |
|-------|-------|------|
| Calculator | `/app/calculator` | Calculator |
| Scenarios | `/app` | FolderOpen |
| Compare | `/compare` | GitCompare |
| Settings | `/app/settings` | User |

### No Footer in App

The authenticated app does not include a footer. Legal content is accessed through settings or external links.

---

## Deep Linking

### Scenario Deep Links

```
/app/calculator?scenario={scenario_id}
```

Opens the calculator with a specific scenario loaded.

### Comparison Deep Links

```
/compare?comparison={comparison_id}&s={scenario_id}&s={scenario_id}
```

Opens a saved comparison or creates a new comparison with specified scenarios.

---

## Implementation Notes

1. All routes are defined in `src/App.tsx`
2. Route guards are implemented in `src/components/auth/` and `src/components/admin/`
3. Navigation state is managed via React Router
4. Query parameters are used for deep linking, not route segments
