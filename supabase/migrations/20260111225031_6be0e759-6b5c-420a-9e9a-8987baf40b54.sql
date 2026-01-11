-- Fix function search_path security warnings

-- Fix tg_set_updated_at function
create or replace function public.tg_set_updated_at()
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

-- Fix tg_set_comparison_version_number function
create or replace function public.tg_set_comparison_version_number()
returns trigger
language plpgsql
security invoker
set search_path = public
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

-- Drop and recreate view without SECURITY DEFINER (use security_invoker instead)
drop view if exists public.v_comparison_latest_version;

create view public.v_comparison_latest_version
with (security_invoker = true)
as
select distinct on (cv.comparison_id)
  cv.*
from public.comparison_versions cv
order by cv.comparison_id, cv.version_number desc;