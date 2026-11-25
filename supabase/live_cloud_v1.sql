-- NEXORA LIVE CLOUD v1 additive upgrade.
-- Run only in the dedicated NEXORA Supabase project after studio_catalog_schema.sql.
-- Never expose service_role/secret keys in Viewer or Studio clients.

create index if not exists episodes_published_order_idx
  on public.episodes (drama_id, episode_number)
  where status = 'published';

create or replace function public.nexora_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists nexora_dramas_updated_at on public.dramas;
create trigger nexora_dramas_updated_at
before update on public.dramas
for each row execute function public.nexora_set_updated_at();

-- Defensive public-read grants paired with the existing RLS policies.
grant select on public.dramas, public.episodes to anon, authenticated;
-- Admin-only CRUD grants are already paired with admin-membership RLS policies.
grant insert, update, delete on public.dramas, public.episodes to authenticated;

-- Studio assets remain private to authenticated admins through the existing RLS policy.

-- Private NEXORA video bucket: admin-only uploads and reads; no public playback grant.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('nexora-videos','nexora-videos',false,52428800,array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['video/mp4','video/webm','video/quicktime'];
drop policy if exists "NEXORA admins upload videos" on storage.objects;
create policy "NEXORA admins upload videos" on storage.objects for insert to authenticated
with check (bucket_id='nexora-videos' and exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
drop policy if exists "NEXORA admins read private videos" on storage.objects;
create policy "NEXORA admins read private videos" on storage.objects for select to authenticated
using (bucket_id='nexora-videos' and exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
drop policy if exists "NEXORA admins delete videos" on storage.objects;
create policy "NEXORA admins delete videos" on storage.objects for delete to authenticated
using (bucket_id='nexora-videos' and exists(select 1 from public.studio_admins a where a.user_id=(select auth.uid())));
