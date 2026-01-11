-- SettleRate SaaS Foundation: profiles, billing, contact_messages tables + RLS + triggers

-- 1) PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles RLS policies
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 2) BILLING TABLE (webhook/service role only for writes)
create table if not exists public.billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists billing_stripe_customer_id_idx on public.billing(stripe_customer_id);
create index if not exists billing_subscription_status_idx on public.billing(subscription_status);

-- Enable RLS on billing
alter table public.billing enable row level security;

-- Billing RLS: users can only SELECT their own row (no insert/update/delete from client)
create policy "billing_select_own"
on public.billing for select
to authenticated
using (auth.uid() = user_id);

-- 3) CONTACT MESSAGES TABLE
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text,
  email text,
  topic text,
  message text,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new'
);

create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages(status);

-- Enable RLS on contact_messages
alter table public.contact_messages enable row level security;

-- Contact messages RLS: anyone can insert (anon + authenticated), no public select/update/delete
create policy "contact_messages_insert_public"
on public.contact_messages for insert
to anon, authenticated
with check (true);

-- 4) TRIGGER: Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- Drop existing trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Updated_at trigger for billing
create or replace function public.tg_set_billing_updated_at()
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

drop trigger if exists set_billing_updated_at on public.billing;
create trigger set_billing_updated_at
before update on public.billing
for each row execute function public.tg_set_billing_updated_at();