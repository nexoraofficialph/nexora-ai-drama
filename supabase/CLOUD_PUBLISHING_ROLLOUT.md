# NEXORA 11.17 cloud publishing / upload rollout

## What this code adds
- Studio cloud catalog publishing using the signed-in Supabase Auth access token. The client verifies its own admin membership before publishing; database RLS remains authoritative.
- Catalog and episode records are upserted; Published status is used only for published dramas and episodes with an HTTPS external video source.
- Viewer reads published dramas and published episode sources from Supabase when configured. Existing local/demo catalog remains if cloud is unavailable.
- Private Supabase Storage bucket `nexora-videos` and admin-only upload/read/delete policies. Studio direct upload is capped at 50 MB.
- Episode tracker adds an optional HTTPS video source field.

## Required setup before live tests
1. Apply `studio_catalog_schema.sql` and then `live_cloud_v1.sql` in the dedicated NEXORA Supabase project.
2. Create the Studio Auth owner and provision that user in `studio_admins` with the trusted SQL procedure described in `PUBLISHING_SETUP.md`.
3. In Studio Cloud Connection, enter the project URL and publishable key; sign in as the provisioned owner.
4. For Viewer cloud catalog, set the URL and publishable key in `supabase-config.js` before building/deploying Viewer. The file is intentionally blank by default.
5. Test with a non-production drama first and verify public anonymous queries cannot see drafts.

## Known limitations (do not claim full end-to-end video playback)
- Private uploads are stored as private object paths and metadata. Viewer signed-URL playback delivery is not implemented yet; uploaded private files do not play in Viewer.
- Direct upload is capped at 50 MB; resumable/TUS upload is needed for larger videos.
- For episodes intended to play now, use a licensed, HTTPS-hosted video URL in the episode source field. Cloud publishing makes that URL available to Viewer for published records; Android/WebView codec, CORS, range and device behavior still require testing.
- Upload endpoint is a single-request upload. Do not rely on it for large videos or interrupted network conditions.
- Live Supabase RLS and Storage tests are pending until the dedicated cloud project is configured.
