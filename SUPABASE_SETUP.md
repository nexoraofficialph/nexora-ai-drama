# NEXORA Account setup

## Supabase connection
1. Create a Supabase project for NEXORA AI DRAMA (do not reuse another app's database without planning).
2. In Supabase project settings, copy the Project URL and the Publishable key (or legacy anon key).
3. Edit `supabase-config.js` and replace:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_PUBLISHABLE_KEY`
4. In Supabase SQL Editor, run `supabase/user_drama_list.sql`.
5. In Supabase Authentication settings, configure Email sign-up and confirmation preferences.

Only the publishable/anon client key belongs in the public mobile client. Never put a service-role or secret key in the app.

## Current scope
- Sign in and sign-up form UI is in the profile tab.
- Authentication uses Supabase Auth email/password when configuration is filled in.
- Saved drama sync is not yet wired; this scaffold only prepares the secure table and account UI.
- My List currently remains local until the next sync implementation.
