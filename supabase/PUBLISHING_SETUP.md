# NEXORA shared catalog publishing setup

This setup document covers the cloud catalog integration introduced in NEXORA 11.17. Client integration exists in the branch, but live connectivity remains unverified until the dedicated Supabase project is configured and tests are completed.

## 1. Confirm the correct Supabase project
Do not apply this SQL to a project that belongs to another app (for example, a portfolio project). Confirm that a dedicated NEXORA project is selected first.

## 2. Apply the schema
In Supabase Dashboard → SQL Editor, run `supabase/studio_catalog_schema.sql`. This creates:
- `studio_admins` — trusted owner/admin membership table
- `dramas` — catalog entries with draft/published/archived states
- `episodes` — episode metadata and source URL
- `studio_assets` — asset records

RLS limits public catalog access to published dramas and episodes under published dramas. Only users present in `studio_admins` can manage catalog records. SQL is written to replace named policies on re-run.

## 3. Add the Studio owner (trusted database action only)
Create/sign up the Studio owner account through Supabase Auth first, then run this in SQL Editor with the exact owner email:

```sql
insert into public.studio_admins (user_id)
select id from auth.users where lower(email) = lower('OWNER_EMAIL_HERE')
on conflict (user_id) do nothing;
```

Verify the row is present:
```sql
select a.user_id, u.email
from public.studio_admins a
join auth.users u on u.id = a.user_id;
```

Never allow the public client to add rows to `studio_admins`. Do not place a service-role or secret key in the APK or Studio's client code.

## 4. Configure both apps
Set the Supabase project URL and publishable (formerly anon) key in each app's client config. Use only the publishable key in mobile/browser code. Both apps must use the same dedicated NEXORA project.

## 5. Publishing integration remains a separate step
The Studio app still uses device-local catalog state. The viewer does not yet load catalog/episode rows from these tables. Before connecting clients, test public read access, admin CRUD, and unauthenticated draft access with separate accounts. Video hosting and upload flows also need a secure Storage bucket and policy design; `video_url` is metadata only.
