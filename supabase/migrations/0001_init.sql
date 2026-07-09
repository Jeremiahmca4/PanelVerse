-- ============================================================
-- Panelverse — initial schema
-- Run this whole file in the Supabase SQL Editor (or `supabase db push`).
-- ============================================================

-- ---------- profiles (mirrors auth.users; billing synced from Stripe) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  -- billing (synced from Stripe via webhook; NEVER client-writable)
  stripe_customer_id text unique,
  stripe_subscription_id text,
  tier text not null default 'free'
        check (tier in ('free','basic','creator','pro')),
  subscription_status text,                    -- 'active' | 'past_due' | 'canceled' | null
  current_period_end timestamptz,
  -- usage (mutated only by server routes via service role)
  uploads_used int not null default 0,         -- lifetime distinct uploads (Free cap)
  exports_used int not null default 0,         -- resets monthly (lazy, calendar month)
  publishes_used int not null default 0,       -- resets monthly (lazy, calendar month)
  usage_period_start date not null default date_trunc('month', now())
);

-- ---------- panoramas (one row per uploaded 360; the user's library) ----------
create table public.panoramas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,                  -- path in Storage bucket 'panoramas'
  width int, height int,                       -- validated ~2:1 equirectangular on upload
  created_at timestamptz default now()
);

-- ---------- comics (draft or published project) ----------
create table public.comics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Your Issue',
  slug text unique,                            -- public URL slug, set on publish
  accent text default '#ff2e4d',
  is_published boolean not null default false,
  published_at timestamptz,
  is_featured boolean not null default false,  -- front-page (Pro only)
  reads int not null default 0,
  pages jsonb not null default '[]',           -- [{ layout:'auto'|'mixA'|'grid6'|'mixB', count:int }]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- panels (per-panel content, keyed within a comic) ----------
create table public.panels (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null references public.comics(id) on delete cascade,
  page_index int not null,
  slot_index int not null,
  panorama_id uuid references public.panoramas(id) on delete set null,
  caption text,
  dialogue text,
  sfx text,
  mood text default 'day',
  pos text default 'center',
  unique (comic_id, page_index, slot_index)
);

-- ---------- indexes ----------
create index panoramas_owner_idx on public.panoramas(owner_id);
create index comics_owner_idx on public.comics(owner_id);
create index comics_published_idx on public.comics(is_published, published_at desc);
create index panels_comic_idx on public.panels(comic_id);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.panoramas enable row level security;
alter table public.comics    enable row level security;
alter table public.panels    enable row level security;

-- profiles: user reads/updates own row only…
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- …but billing + usage columns are NOT client-writable. Column-level privileges:
-- authenticated users may update display_name only. Service role bypasses RLS
-- and grants, so webhooks / server routes still write tier & counters.
revoke update on public.profiles from authenticated, anon;
grant  update (display_name) on public.profiles to authenticated;

-- panoramas: owner-only
create policy "panoramas: own all" on public.panoramas
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- comics: owner full access; everyone may read published
create policy "comics: own all" on public.comics
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "comics: public read published" on public.comics
  for select using (is_published = true);

-- panels: owner-only via parent comic; public read when parent is published
create policy "panels: own all" on public.panels
  for all using (exists (select 1 from public.comics c where c.id = comic_id and c.owner_id = auth.uid()))
  with check   (exists (select 1 from public.comics c where c.id = comic_id and c.owner_id = auth.uid()));
create policy "panels: public read published" on public.panels
  for select using (exists (select 1 from public.comics c where c.id = comic_id and c.is_published = true));

-- ============================================================
-- Auto-create a profile row on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Read counter: callable by anyone (server action uses it on /read/[slug] load)
-- ============================================================
create or replace function public.bump_reads(comic_slug text)
returns void language sql security definer set search_path = public as $$
  update public.comics set reads = reads + 1
  where slug = comic_slug and is_published = true;
$$;

-- ============================================================
-- Storage: private 'panoramas' bucket, owner-scoped paths ({user_id}/{uuid}.ext)
-- (If this insert errors on your project, create the bucket in the dashboard
--  as PRIVATE and re-run only the policies below.)
-- ============================================================
insert into storage.buckets (id, name, public) values ('panoramas', 'panoramas', false)
on conflict (id) do nothing;

create policy "panoramas bucket: own read" on storage.objects
  for select using (bucket_id = 'panoramas' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "panoramas bucket: own insert" on storage.objects
  for insert with check (bucket_id = 'panoramas' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "panoramas bucket: own delete" on storage.objects
  for delete using (bucket_id = 'panoramas' and auth.uid()::text = (storage.foldername(name))[1]);
