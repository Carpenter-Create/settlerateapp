-- =========================================
-- SettleRate: Comparison Share Links (foundation)
-- Migrations + RLS in one block
-- =========================================

-- 1) Extensions (safe if already enabled)
create extension if not exists pgcrypto;

-- 2) Table: comparison_shares
-- A share link is a permissioned token for a comparison export.
create table if not exists public.comparison_shares (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null,
  created_by uuid not null,
  token text not null unique,
  permission text not null default 'view' check (permission in ('view')),
  require_auth boolean not null default false,
  expires_at timestamptz null,
  revoked_at timestamptz null,
  last_accessed_at timestamptz null,
  access_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Foreign keys (references saved_comparisons, not comparisons)
alter table public.comparison_shares
  add constraint comparison_shares_comparison_id_fkey
  foreign key (comparison_id) references public.saved_comparisons(id)
  on delete cascade;

alter table public.comparison_shares
  add constraint comparison_shares_created_by_fkey
  foreign key (created_by) references auth.users(id)
  on delete restrict;

-- 4) Trigger: updated_at (reuse existing function)
create trigger trg_comparison_shares_updated_at
before update on public.comparison_shares
for each row execute function public.tg_set_updated_at();

-- 5) RLS ON
alter table public.comparison_shares enable row level security;

-- 6) Policies - Owner-only management
create policy "comparison_shares_select_owner"
on public.comparison_shares
for select
to authenticated
using (
  exists (
    select 1
    from public.saved_comparisons c
    where c.id = comparison_shares.comparison_id
      and c.user_id = auth.uid()
  )
);

create policy "comparison_shares_insert_owner"
on public.comparison_shares
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.saved_comparisons c
    where c.id = comparison_id
      and c.user_id = auth.uid()
  )
);

create policy "comparison_shares_update_owner"
on public.comparison_shares
for update
to authenticated
using (
  exists (
    select 1
    from public.saved_comparisons c
    where c.id = comparison_shares.comparison_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.saved_comparisons c
    where c.id = comparison_shares.comparison_id
      and c.user_id = auth.uid()
  )
);

create policy "comparison_shares_delete_owner"
on public.comparison_shares
for delete
to authenticated
using (
  exists (
    select 1
    from public.saved_comparisons c
    where c.id = comparison_shares.comparison_id
      and c.user_id = auth.uid()
  )
);

-- 7) Secure token generator
create or replace function public.generate_share_token()
returns text
language sql
as $$
  select encode(gen_random_bytes(24), 'base64url');
$$;

-- 8) SECURITY DEFINER function to validate a share token
create or replace function public.validate_comparison_share(p_token text)
returns table (
  share_id uuid,
  comparison_id uuid,
  permission text,
  require_auth boolean,
  expires_at timestamptz,
  revoked_at timestamptz,
  is_valid boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    s.id,
    s.comparison_id,
    s.permission,
    s.require_auth,
    s.expires_at,
    s.revoked_at,
    (
      s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
    ) as is_valid
  from public.comparison_shares s
  where s.token = p_token
  limit 1;
end;
$$;

-- Lock down function privileges
revoke all on function public.validate_comparison_share(text) from public;
grant execute on function public.validate_comparison_share(text) to anon, authenticated;

-- 9) Access log update helper
create or replace function public.touch_comparison_share(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.comparison_shares
  set
    last_accessed_at = now(),
    access_count = access_count + 1
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());
end;
$$;

revoke all on function public.touch_comparison_share(text) from public;
grant execute on function public.touch_comparison_share(text) to anon, authenticated;