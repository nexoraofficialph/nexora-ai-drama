# NEXORA AI DRAMA 11.1 — Firebase Maya / QR Ph wallet

Initial payment setup is **manual verification only**. It supports Maya and QR Ph payment references, but it does not automatically detect payments from a personal Maya account or QR Ph screenshot.

## Coin packages (server-authoritative)
- starter: 500 coins / PHP 49
- value: 1,200 coins / PHP 99
- premium: 3,000 coins / PHP 199

## Deploy

Firebase Auth Email/Password must be enabled. The current app profile/login UI still uses the existing Supabase auth code; this 11.1 payment UI uses Firebase Auth separately until a deliberate auth migration/bridge is implemented. Users will need a Firebase account to create a coin payment order in this interim release.
1. Create a Firebase project and enable Authentication (Email/Password) and Firestore.
2. Install Firebase CLI, sign in, and select your project: `firebase use --add`.
3. Set an admin custom claim on your trusted admin account (`admin: true`) using a trusted server/Admin SDK process only. Never set this from the client.
4. From the repository root, install function dependencies: `cd firebase/functions && npm install`.
5. Deploy: `firebase deploy --only firestore:rules,functions`.
6. Add Firebase web app configuration to `firebase-config.js`. Firebase client config is public by design; restrict API key usage in Google Cloud Console. Never add Admin SDK keys or payment provider secrets to client files.
7. Add your real QR images and receiver display names to `NEXORA_PAYMENT_DETAILS` in `firebase-config.js` only after you confirm the account destinations. Keep these fields blank until then; checkout reference submission stays disabled without QR image URL.

8. The admin callable `adminVerifyPaymentAndCreditCoins` is restricted by the Firebase Auth admin custom claim. A trusted admin verifies payment in Maya/QR Ph, then approves or rejects the order.
9. Test with Firebase Emulator Suite and test accounts before production.

## Current limits
- No automatic Maya/QR Ph payment status callback is connected.
- No payment QR is embedded; add your own Maya/QR Ph payment instructions/QR after confirming the destination.
- The app's existing Supabase-based auth/wallet UI has not been migrated to Firebase in this first scaffold.
- Do not launch or sell coins until the UI is wired to these functions, admin verification is tested, and security rules/functions are deployed and reviewed.
