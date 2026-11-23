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
