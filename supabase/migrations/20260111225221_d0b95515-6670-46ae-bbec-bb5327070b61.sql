-- Create scenarios table with canonical contract v1
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  name text not null,
  scenario_type text not null check (scenario_type in ('purchase', 'refinance')),
  
  schema_version int not null default 1,
  inputs jsonb not null default '{}'::jsonb,
  derived jsonb not null default '{}'::jsonb,
  assumptions_hash text,
  
  is_archived boolean not null default false,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scenarios_user_id_idx on public.scenarios(user_id);
create index if not exists scenarios_updated_at_idx on public.scenarios(updated_at desc);
create index if not exists scenarios_is_archived_idx on public.scenarios(is_archived);

-- updated_at trigger (reuse if exists, or create)
create or replace function public.tg_set_scenarios_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scenarios_updated_at on public.scenarios;
create trigger set_scenarios_updated_at
before update on public.scenarios
for each row execute function public.tg_set_scenarios_updated_at();

-- RLS policies
alter table public.scenarios enable row level security;

create policy "scenarios_select_own"
on public.scenarios for select
using (auth.uid() = user_id);

create policy "scenarios_insert_own"
on public.scenarios for insert
with check (auth.uid() = user_id);

create policy "scenarios_update_own"
on public.scenarios for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "scenarios_delete_own"
on public.scenarios for delete
using (auth.uid() = user_id);

-- Bulletproof duplication RPC
create or replace function public.duplicate_scenario(
  source_scenario_id uuid,
  new_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  src record;
  new_id uuid;
  resolved_name text;
begin
  select *
    into src
  from public.scenarios
  where id = source_scenario_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Scenario not found or access denied';
  end if;

  resolved_name := coalesce(new_name, src.name || ' (Copy)');

  insert into public.scenarios (
    user_id,
    name,
    scenario_type,
    schema_version,
    inputs,
    derived,
    assumptions_hash,
    is_archived
  )
  values (
    auth.uid(),
    resolved_name,
    src.scenario_type,
    src.schema_version,
    src.inputs,
    src.derived,
    src.assumptions_hash,
    false
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Security: only authenticated users can call
revoke all on function public.duplicate_scenario(uuid, text) from public;
grant execute on function public.duplicate_scenario(uuid, text) to authenticated;