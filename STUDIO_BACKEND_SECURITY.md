# NEXORA STUDIO backend groundwork

This SQL is a schema draft, not applied to any Supabase project.

## Tables
- `studio_admins`: admin membership (restricted table; owner can view own membership).
- `dramas`: catalog entries, draft/published/archive states.
- `episodes`: episode metadata, publishing state, optional video and thumbnail URLs.
- `studio_assets`: production asset references and notes.

## Security model
- RLS enabled on all tables.
- Public SELECT is restricted to published dramas and episodes from published dramas.
- Studio mutations require membership in `studio_admins`.
- Membership rows must be provisioned only by a trusted owner/service-side process. Never expose service-role keys in the app.
- Policies must be reviewed and tested before deployment. In particular, any future Storage buckets need their own policies.
- Admin membership is not derived from user-editable metadata.

## Apply status
Not applied. A dedicated NEXORA Supabase project and chosen organization are required before deployment.
