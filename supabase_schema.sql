-- ============================================
-- Evo Studios Supabase Schema + Policies
-- ============================================
-- 1) Create bucket:
--   Storage -> Buckets -> New bucket
--   Name: evo
--   Public: ON (public read)
--
-- 2) Run this SQL in: SQL Editor
-- ============================================

-- Enable extensions if needed (usually already)
create extension if not exists "uuid-ossp";

-- MODELS TABLE
create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  category text default 'Model',
  thumb_path text,
  file_path text,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid()
);

-- FEED TABLE
create table if not exists public.feed (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  tag text default 'News',
  media_path text,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid()
);

-- Indexes
create index if not exists models_created_at_idx on public.models (created_at desc);
create index if not exists feed_created_at_idx on public.feed (created_at desc);

-- ============================================
-- RLS
-- ============================================
alter table public.models enable row level security;
alter table public.feed enable row level security;

-- Public can read
drop policy if exists "models_public_read" on public.models;
create policy "models_public_read"
on public.models for select
to anon, authenticated
using (true);

drop policy if exists "feed_public_read" on public.feed;
create policy "feed_public_read"
on public.feed for select
to anon, authenticated
using (true);

-- Only owner (created_by) can write/delete
drop policy if exists "models_owner_write" on public.models;
create policy "models_owner_write"
on public.models for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "models_owner_update" on public.models;
create policy "models_owner_update"
on public.models for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "models_owner_delete" on public.models;
create policy "models_owner_delete"
on public.models for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists "feed_owner_write" on public.feed;
create policy "feed_owner_write"
on public.feed for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "feed_owner_update" on public.feed;
create policy "feed_owner_update"
on public.feed for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "feed_owner_delete" on public.feed;
create policy "feed_owner_delete"
on public.feed for delete
to authenticated
using (auth.uid() = created_by);

-- ============================================
-- STORAGE POLICIES (Bucket: evo)
-- ============================================
-- IMPORTANT:
-- These policies are for the storage.objects table.
-- We'll allow:
--   - public read (because bucket is public)
--   - authenticated upload
--   - only owner delete (owner is auth.uid())

-- Public read
drop policy if exists "storage_public_read_evo" on storage.objects;
create policy "storage_public_read_evo"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'evo');

-- Authenticated can upload to bucket evo
drop policy if exists "storage_auth_upload_evo" on storage.objects;
create policy "storage_auth_upload_evo"
on storage.objects for insert
to authenticated
with check (bucket_id = 'evo');

-- Only owner can delete
drop policy if exists "storage_owner_delete_evo" on storage.objects;
create policy "storage_owner_delete_evo"
on storage.objects for delete
to authenticated
using (bucket_id = 'evo' and owner = auth.uid());