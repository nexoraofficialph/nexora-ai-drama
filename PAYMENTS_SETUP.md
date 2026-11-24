# NEXORA AI DRAMA — Firebase Coin Wallet & Payment Status (11.12)

## Current status: CHECKOUT DISABLED

The app is migrating to a Firebase-only account and wallet path. Coin checkout is intentionally disabled in the app (nxStartCheckout is a guard that returns a paused message). Do not accept or advertise real payments from the app at this time.

- Firebase Authentication: email/password sign-in and sign-up.
- Wallet balance and order history: Firestore read-only from the client.
- Coin crediting: server-side Firebase callable only after an administrator verifies payment.
- Episode unlocking: server-side 10-coin debit and unlock transaction, with server entitlement verification.
- Payment methods: intended manual receiving methods are Maya and QR Ph only. GCash is not supported in the current code.
- Receiver names and QR images are blank in firebase-config.js; no configured receiver means no usable checkout.
- The firebase/payment-ui.js module is present but is not connected as the active checkout flow. Do not treat its UI as live.
- Premium subscription billing and rewarded ads are not connected in release mode. Simulated ads and demo coins require explicit ?demo=1.

## Backend callable functions

firebase/functions/index.js includes:
- createCoinOrder: server-defined coin packages and prices; authenticated user required.
- submitPaymentReference: authenticated, pending-order-only reference submission; duplicate references are guarded.
- adminVerifyPaymentAndCreditCoins: admin claim required; credit/rejection updates use a transaction and a purchase ledger.
- spendCoinsAndUnlockEpisode: authenticated, transactionally debits 10 coins and creates the episode entitlement/ledger entry.
- verifyEpisodeUnlock: server-authoritative entitlement check.

Firestore client rules deny writes to wallet, orders, ledger, episode unlocks, and global payment orders. Users may only read their own protected records; My List writes are constrained to the signed-in user's own library document.

## Required setup before enabling purchases

1. Configure real Maya and QR Ph receiver display names and HTTPS QR image URLs in firebase-config.js (only after confirming the receiver accounts).
2. Deploy and verify the current Firebase callable functions and Firestore rules.
3. Ensure administrator accounts receive the Firebase custom claim admin: true through a trusted server/admin process. Never set this claim from the client.
4. Add a real in-app checkout UI that creates an order, selects the payment method, submits the reference, and displays order state. Keep client-side wallet crediting disabled.
5. Test successful payment, failed/rejected payment, duplicate references, concurrent verification, account switching, insufficient balance, repeated episode unlock, and cross-user entitlement checks with Firebase Emulator Suite or a test project.
6. Test on a physical Android device. A successful APK build is not evidence of live payment or playback behavior.
7. Only enable live checkout after the payment verification and test evidence are reviewed. Payment QR details, admin claim, Firebase deployment, and real transaction tests remain unverified.

## Package amounts (server-defined)

- Starter: 500 coins — PHP 49
- Value: 1,200 coins — PHP 99
- Premium: 3,000 coins — PHP 199

These package definitions exist in backend code, but checkout is paused and no live payment provider integration is connected.
