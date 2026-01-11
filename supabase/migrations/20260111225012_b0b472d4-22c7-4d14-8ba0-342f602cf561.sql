-- Enable crypto for UUID + hashing if not already enabled
create extension if not exists pgcrypto;

-- A) Parent: Saved comparisons
create table if not exists public.saved_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  description text null,

  -- convenience
  is_archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_comparisons_user_id_idx
  on public.saved_comparisons(user_id);

create index if not exists saved_comparisons_updated_at_idx
  on public.saved_comparisons(updated_at desc);

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_saved_comparisons_updated_at on public.saved_comparisons;
create trigger set_saved_comparisons_updated_at
before update on public.saved_comparisons
for each row execute function public.tg_set_updated_at();


-- B) Items: Which scenarios are included in the comparison
create table if not exists public.comparison_items (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.saved_comparisons(id) on delete cascade,

  scenario_id text not null,

  -- Order + display
  sort_order integer not null default 0,
  label_override text null,

  created_at timestamptz not null default now(),

  unique (comparison_id, scenario_id)
);

create index if not exists comparison_items_comparison_id_idx
  on public.comparison_items(comparison_id);

create index if not exists comparison_items_scenario_id_idx
  on public.comparison_items(scenario_id);


-- C) Versions: Immutable snapshots (what you diff/export)
create table if not exists public.comparison_versions (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.saved_comparisons(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,

  version_number integer not null,

  -- Canonical contract versioning (your internal schema version for scenario snapshot shape)
  schema_version integer not null default 1,

  -- Snapshot payload
  snapshot jsonb not null,

  -- Used for quick equality checks
  assumptions_hash text not null,

  note text null,
  created_at timestamptz not null default now(),

  unique (comparison_id, version_number)
);

create index if not exists comparison_versions_comparison_id_idx
  on public.comparison_versions(comparison_id);

create index if not exists comparison_versions_created_at_idx
  on public.comparison_versions(created_at desc);


-- Auto-increment version_number per comparison
create or replace function public.tg_set_comparison_version_number()
returns trigger
language plpgsql
as $$
declare
  next_ver integer;
begin
  if new.version_number is null or new.version_number = 0 then
    select coalesce(max(version_number), 0) + 1
      into next_ver
    from public.comparison_versions
    where comparison_id = new.comparison_id;

    new.version_number = next_ver;
  end if;

  return new;
end;
$$;

drop trigger if exists set_comparison_version_number on public.comparison_versions;
create trigger set_comparison_version_number
before insert on public.comparison_versions
for each row execute function public.tg_set_comparison_version_number();


-- Helper view: latest version per comparison
create or replace view public.v_comparison_latest_version as
select distinct on (cv.comparison_id)
  cv.*
from public.comparison_versions cv
order by cv.comparison_id, cv.version_number desc;


-- RLS POLICIES

alter table public.saved_comparisons enable row level security;
alter table public.comparison_items enable row level security;
alter table public.comparison_versions enable row level security;

-- saved_comparisons: user owns row
create policy "saved_comparisons_select_own"
on public.saved_comparisons for select
using (auth.uid() = user_id);

create policy "saved_comparisons_insert_own"
on public.saved_comparisons for insert
with check (auth.uid() = user_id);

create policy "saved_comparisons_update_own"
on public.saved_comparisons for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "saved_comparisons_delete_own"
on public.saved_comparisons for delete
using (auth.uid() = user_id);


-- comparison_items: accessible if user owns parent comparison
create policy "comparison_items_select_parent_owner"
on public.comparison_items for select
using (
  exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
);

create policy "comparison_items_insert_parent_owner"
on public.comparison_items for insert
with check (
  exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
);

create policy "comparison_items_update_parent_owner"
on public.comparison_items for update
using (
  exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
);

create policy "comparison_items_delete_parent_owner"
on public.comparison_items for delete
using (
  exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
);


-- comparison_versions: accessible if user owns parent comparison
create policy "comparison_versions_select_parent_owner"
on public.comparison_versions for select
using (
  exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
);

create policy "comparison_versions_insert_parent_owner"
on public.comparison_versions for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
);

create policy "comparison_versions_delete_parent_owner"
on public.comparison_versions for delete
using (
  exists (
    select 1
    from public.saved_comparisons sc
    where sc.id = comparison_id
      and sc.user_id = auth.uid()
  )
);

-- Make comparison_versions immutable (no updates allowed)
revoke update on public.comparison_versions from anon, authenticated;