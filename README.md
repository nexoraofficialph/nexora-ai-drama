# nexora-ai-drama
NEXORA AI DRAMA — A cinematic AI-powered micro-drama streaming platform managed by NEXORA STUDIO.


## Android Preview APK build (10.10)

1. Open **Actions** in GitHub.
2. Select **Android APK Preview Build**.
3. Tap **Run workflow** on `main`.
4. Wait for the build to complete, then download the `nexora-debug-apk` artifact.

The workflow creates the Capacitor Android project during the CI run and builds a debug APK artifact. It is a preview/debug build, not a Play Store release-signed APK.


## Publishing checklist

- Replace all sample/demo episode streams with licensed real video sources.
- Set `NX_DEMO_MEDIA_MODE` to `false` in `index.html` to hide demo playback, fake coin rewards, demo shop, and demo subscription controls.
- Configure Supabase project URL and publishable/anon key in `supabase-config.js`.
- Implement and verify real rewarded ads, billing, subscription entitlement, server-side coin ledger, and episode access controls before charging users.
- Create release signing credentials and secure them in GitHub Actions secrets before producing a signed release APK/AAB.
- Test playback, account sync, purchases, and locked/free episode flows on real Android devices.
