-- NEXORA AI DRAMA: user-owned saved drama list.
-- Apply only to the NEXORA Supabase project after project setup.
create table if not exists public.user_drama_list (
  user_id uuid not null references auth.users(id) on delete cascade,
  drama_id integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, drama_id)
);
alter table public.user_drama_list enable row level security;
grant select, insert, delete on public.user_drama_list to authenticated;
create policy "Users can read their own saved dramas"
  on public.user_drama_list for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can save dramas to their own list"
  on public.user_drama_list for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can remove dramas from their own list"
  on public.user_drama_list for delete to authenticated
  using ((select auth.uid()) = user_id);
