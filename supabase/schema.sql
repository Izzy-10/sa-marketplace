-- Starter schema for The Local Market.
-- Run in the Supabase SQL editor. Review policies before production use.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 90),
  category text not null check (category in ('Home & Living', 'Food & Drink', 'Wellness', 'Art & Design', 'Services')),
  description text not null check (char_length(description) between 1 and 400),
  price numeric(10,2) not null check (price >= 0),
  business_name text not null check (char_length(business_name) between 1 and 80),
  location text,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_active_created_idx
  on public.listings (status, created_at desc);
create index if not exists listings_seller_idx
  on public.listings (seller_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Anyone can read active listings" on public.listings;
create policy "Anyone can read active listings"
  on public.listings for select
  using (status = 'active' or auth.uid() = seller_id);

drop policy if exists "Sellers can create their own listings" on public.listings;
create policy "Sellers can create their own listings"
  on public.listings for insert
  to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can update their own listings" on public.listings;
create policy "Sellers can update their own listings"
  on public.listings for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can delete their own listings" on public.listings;
create policy "Sellers can delete their own listings"
  on public.listings for delete
  to authenticated
  using (auth.uid() = seller_id);

grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant select, update on public.profiles to authenticated;
