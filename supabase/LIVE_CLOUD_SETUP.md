# NEXORA LIVE CLOUD v1

This adds live published catalog and episode-source reads to Viewer, using the existing secure RLS schema.

## Apply in the intended Supabase project

1. Confirm the project is dedicated to NEXORA (do not use unrelated projects).
2. Run `studio_catalog_schema.sql`.
3. Run `live_cloud_v1.sql`.
4. In Authentication, create or invite the Studio owner account.
5. Provision admin membership using trusted SQL, replacing the email with the exact owner email:

```sql
insert into public.studio_admins (user_id)
select id from auth.users where lower(email) = lower('OWNER_EMAIL_HERE')
on conflict (user_id) do nothing;
```

6. Configure Viewer with the project's URL and publishable key in `supabase-config.js`. Never use a service role or secret key in client code.
7. Published dramas and episodes should be visible to Viewer via RLS. Viewer loads published drama records and their published episode `video_url` values. When cloud is unavailable, local/demo catalog remains.

## Expected cloud columns

- dramas: `id,title,slug,synopsis,genre,poster_url,total_episodes,status,updated_at`
- episodes: `drama_id,episode_number,title,synopsis,video_url,thumbnail_url,status`

## Stream URLs

Only use video URLs you own or are licensed to stream. Direct HTTPS MP4 links may play depending on Android/WebView codecs and host CORS/range support. HLS (`.m3u8`) playback is not guaranteed by the built-in player without an HLS library/native player.

## Status

Viewer cloud catalog read and episode-source playback wiring are committed, but cloud publishing is **not live yet** until a dedicated project is configured, SQL is applied, admin membership is provisioned, and Studio write integration is completed.
