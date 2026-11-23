# NEXORA Direct Payments v1 — Setup

**Current status:** Backend scaffolding committed. Not live, not wired to the in-app wallet UI, and not yet tested with PayMongo. Do not advertise or accept real payments until setup and tests are complete.

## Payment packages (editable in `supabase/functions/nx-create-checkout/index.ts`)
- Starter: 500 coins — PHP 49
- Value: 1,200 coins — PHP 99
- Premium: 3,000 coins — PHP 199

## Required account setup
1. Create/activate a PayMongo merchant account and complete its required verification.
2. In PayMongo Dashboard, enable GCash, Maya, and QR Ph where eligible. Individual account capability may be limited to QR Ph; GCash/Maya may require an approved registered business profile.
3. Create Supabase project and configure app's `supabase-config.js` with its URL and publishable/anon key. This repo's config currently has placeholders.
4. Run migrations in order: `202611240001_direct_payments.sql`, then `202611240002_payment_fulfillment_hardening.sql` in the Supabase SQL editor. The second migration validates paid amount/currency and deduplicates credits by provider payment ID.
5. Deploy Edge Functions:
   ```sh
   supabase functions deploy nx-create-checkout
   supabase functions deploy nx-paymongo-webhook --no-verify-jwt
   ```
6. Set function secrets (never commit them):
   ```sh
   supabase secrets set PAYMONGO_SECRET_KEY=sk_test_...
   supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsk_...
   supabase secrets set PAYMONGO_MODE=test
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
   ```
   The Supabase platform provides SUPABASE_URL and SUPABASE_ANON_KEY to deployed functions; ensure service role is set securely.
7. Register PayMongo webhook endpoint to the deployed `nx-paymongo-webhook` URL and subscribe to `checkout_session.payment.paid`. Use a **test webhook secret** with test keys; configure live separately.
8. Verify signature validation and duplicate-event handling in test mode, then test: success, cancellation, failed payment, replayed webhook, concurrent duplicate, wrong amount, expired QR, and no logged-in user.
9. Add frontend coin store buttons to call `nx-create-checkout` with authenticated Supabase session, open returned `checkoutUrl`, and reload wallet balance after verified payment. Never credit coins from client redirect/success screens.
10. Before live: audit the RPC and policies, test payment amounts/reference validation, refund/reversal policy, payment provider account capabilities, and test with real devices.
11. The app coin store is wired to the `nx-create-checkout` Edge Function. Sign-in is required; a checkout redirect does not credit coins. Use the Refresh wallet/status button after payment while webhook processing is confirmed.

## Payment behavior
- The Edge Function authenticates the Supabase user and accepts only server-defined package IDs. Price/coin values cannot be client-specified.
- Payment creation writes a pending order before requesting checkout.
- Webhook signature is verified using the raw request body before processing.
- Coin credit is server-side through an RPC and ledger reference. Repeated callbacks for a paid order are idempotent.
- Client-facing success redirect is not proof of payment; webhook is the source of truth.

## Current limitation
The existing app uses Supabase and its Supabase configuration is placeholder-only. No Firebase coin system exists in the inspected repo. These files create the Supabase-based payment backend, but they do not yet add the coin-store UI or wallet balance display in the app, and no Supabase deployment/payment tests have run.