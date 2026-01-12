# SECURITY_MODEL.md — SettleRate Application

## Purpose

This document defines the security model for the SettleRate application, focusing on data access control and user isolation.

---

## Core Principle

> **No cross-user access.**

Users can only access their own data. No user can view, modify, or delete another user's scenarios, comparisons, or profile data.

---

## Row-Level Security (RLS)

### Requirement

RLS is **required** on all user data tables. Tables without RLS enabled are considered security vulnerabilities.

### Standard RLS Pattern

Every user-owned table should have these policies:

```sql
-- Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Users can view their own rows
CREATE POLICY "Users can view their own data"
ON public.table_name
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own rows
CREATE POLICY "Users can insert their own data"
ON public.table_name
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own rows
CREATE POLICY "Users can update their own data"
ON public.table_name
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own rows
CREATE POLICY "Users can delete their own data"
ON public.table_name
FOR DELETE
USING (auth.uid() = user_id);
```

---

## Admin Access

Admin access is explicit and requires:

1. Entry in `user_roles` table with `role = 'admin'`
2. Verification via `has_role(auth.uid(), 'admin')` function
3. RLS policies that explicitly grant admin access

### Admin Policy Pattern

```sql
CREATE POLICY "Admins can view all rows"
ON public.table_name
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);
```

---

## Authentication

### Requirements

- All app routes (`/app/*`) require authentication
- Anonymous users are supported but cannot save data permanently
- Session tokens are managed by Supabase Auth
- OAuth providers: Google, Apple (when configured)
- Magic link authentication for email-based sign-in

### Session Security

- Sessions are validated server-side on every request
- JWT tokens expire and must be refreshed
- Sign-out invalidates the current session

---

## API Security

### Edge Functions

- All edge functions validate the `Authorization` header
- User context is derived from the JWT, not from request body
- Never trust client-provided user IDs for authorization decisions

### Supabase Client

- The anon key is safe to expose (it's public)
- RLS policies protect data regardless of client
- Service role key is **never** exposed to the client

---

## Prohibited Patterns

1. **Never** check admin status via localStorage or sessionStorage
2. **Never** hardcode admin credentials or user IDs
3. **Never** use client-side checks as the only authorization gate
4. **Never** disable RLS on user data tables
5. **Never** store sensitive data in localStorage

---

## Audit Trail

The following actions should be logged (when implemented):

- Admin role assignments
- Subscription changes
- Data exports
- Account deletions

---

## Incident Response

If a security vulnerability is discovered:

1. Immediately disable affected functionality
2. Review RLS policies on affected tables
3. Audit access logs for unauthorized access
4. Notify affected users if data was exposed
