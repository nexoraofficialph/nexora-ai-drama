-- NEXORA STUDIO Cloud Catalog schema (migration groundwork)
-- Owner/admin authorization relies on app_metadata claims managed server-side.
create extension if not exists pgcrypto;

create table if not exists public.studio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.studio_admins enable row level security;
revoke all on public.studio_admins from anon, authenticated;
grant select on public.studio_admins to authenticated;
create policy "admins can view own studio membership" on public.studio_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.dramas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  synopsis text not null default '',
  genre text not null default 'Drama',
  poster_url text,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  total_episodes integer not null default 0 check(total_episodes >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dramas enable row level security;
create policy "public can view published dramas" on public.dramas for select to anon, authenticated using (status='published');
create policy "studio admins can view all dramas" on public.dramas for select to authenticated using (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
create policy "studio admins insert dramas" on public.dramas for insert to authenticated with check (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
create policy "studio admins update dramas" on public.dramas for update to authenticated using (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
create policy "studio admins delete dramas" on public.dramas for delete to authenticated using (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid not null references public.dramas(id) on delete cascade,
  episode_number integer not null check(episode_number > 0),
  title text not null default '',
  synopsis text not null default '',
  video_url text,
  thumbnail_url text,
  status text not null default 'draft' check(status in ('draft','published')),
  duration_seconds integer check(duration_seconds is null or duration_seconds >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(drama_id, episode_number)
);
alter table public.episodes enable row level security;
create policy "public can view episodes of published dramas" on public.episodes for select to anon, authenticated using (status='published' and exists(select 1 from public.dramas d where d.id=drama_id and d.status='published'));
create policy "admins view all episodes" on public.episodes for select to authenticated using (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
create policy "admins insert episodes" on public.episodes for insert to authenticated with check (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
create policy "admins update episodes" on public.episodes for update to authenticated using (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
create policy "admins delete episodes" on public.episodes for delete to authenticated using (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));

create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid references public.dramas(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  asset_type text not null check(asset_type in ('poster','thumbnail','trailer','video','audio','other')),
  storage_path text,
  external_url text,
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.studio_assets enable row level security;
create policy "admins manage studio assets" on public.studio_assets for all to authenticated using (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));

create index if not exists dramas_status_updated_idx on public.dramas(status, updated_at desc);
create index if not exists episodes_drama_status_idx on public.episodes(drama_id,status,episode_number);
create index if not exists assets_drama_idx on public.studio_assets(drama_id);
