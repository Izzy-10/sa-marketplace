-- Marketplace MVP schema for Supabase. Run in SQL Editor after backing up any existing data.
-- Uses the browser-safe publishable/anon key plus Supabase Auth and row-level security.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text,
  bio text,
  location text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade the earlier starter schema without removing listing data.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles drop column if exists email;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 90),
  category text not null check (category in ('Home & Living', 'Food & Drink', 'Wellness', 'Art & Design', 'Services')),
  description text not null check (char_length(description) between 1 and 400),
  price numeric(10,2) not null check (price >= 0),
  business_name text not null check (char_length(business_name) between 1 and 80),
  location text,
  image_url text,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listings add column if not exists image_url text;
alter table public.listings add column if not exists updated_at timestamptz not null default now();
create index if not exists listings_active_created_idx on public.listings(status, created_at desc);
create index if not exists listings_seller_idx on public.listings(seller_id);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'closed')),
  created_at timestamptz not null default now(),
  constraint inquiry_buyer_not_seller check (buyer_id <> seller_id)
);
create index if not exists inquiries_seller_created_idx on public.inquiries(seller_id, created_at desc);
create index if not exists inquiries_buyer_created_idx on public.inquiries(buyer_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.inquiries enable row level security;

drop policy if exists "Public can view business profiles" on public.profiles;
create policy "Public can view business profiles" on public.profiles for select using (true);
drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Anyone can read active listings" on public.listings;
create policy "Anyone can read active listings" on public.listings for select using (status = 'active' or auth.uid() = seller_id);
drop policy if exists "Sellers can create their own listings" on public.listings;
create policy "Sellers can create their own listings" on public.listings for insert to authenticated with check (auth.uid() = seller_id);
drop policy if exists "Sellers can update their own listings" on public.listings;
create policy "Sellers can update their own listings" on public.listings for update to authenticated using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
drop policy if exists "Sellers can delete their own listings" on public.listings;
create policy "Sellers can delete their own listings" on public.listings for delete to authenticated using (auth.uid() = seller_id);

drop policy if exists "Buyers can create inquiries for active listings" on public.inquiries;
create policy "Buyers can create inquiries for active listings" on public.inquiries for insert to authenticated with check (
  auth.uid() = buyer_id and buyer_id <> seller_id and exists (
    select 1 from public.listings l where l.id = listing_id and l.seller_id = seller_id and l.status = 'active'
  )
);
drop policy if exists "Buyers and sellers can read their inquiries" on public.inquiries;
create policy "Buyers and sellers can read their inquiries" on public.inquiries for select to authenticated using (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "Sellers can update inquiry status" on public.inquiries;
create policy "Sellers can update inquiry status" on public.inquiries for update to authenticated using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant select, insert, update on public.inquiries to authenticated;

-- Public listing photos; object paths must begin with the authenticated user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Public can view listing images" on storage.objects;
create policy "Public can view listing images" on storage.objects for select using (bucket_id = 'listing-images');
drop policy if exists "Sellers can upload own listing images" on storage.objects;
create policy "Sellers can upload own listing images" on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Sellers can update own listing images" on storage.objects;
create policy "Sellers can update own listing images" on storage.objects for update to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Sellers can delete own listing images" on storage.objects;
create policy "Sellers can delete own listing images" on storage.objects for delete to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
