const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
initializeApp();
const db = getFirestore();

const PACKAGES = Object.freeze({
  starter: { coins: 500, pricePhp: 49 },
  value: { coins: 1200, pricePhp: 99 },
  premium: { coins: 3000, pricePhp: 199 }
});

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  return request.auth.uid;
}

exports.createCoinOrder = onCall(async (request) => {
  const uid = requireAuth(request);
  const packageId = String(request.data?.packageId || "");
  const pack = PACKAGES[packageId];
  if (!pack) throw new HttpsError("invalid-argument", "Unknown coin package.");

  const orderRef = db.collection("paymentOrders").doc();
  const userOrderRef = db.collection("users").doc(uid).collection("orders").doc(orderRef.id);
  const now = FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    tx.create(orderRef, { userId: uid, packageId, coins: pack.coins, pricePhp: pack.pricePhp,
      paymentMethod: null, paymentReference: null, status: "awaiting_payment", createdAt: now });
    tx.create(userOrderRef, { packageId, coins: pack.coins, pricePhp: pack.pricePhp,
      status: "awaiting_payment", createdAt: now });
  });
  return { orderId: orderRef.id, packageId, coins: pack.coins, amountPhp: pack.pricePhp, status: "awaiting_payment" };
});

exports.submitPaymentReference = onCall(async (request) => {
  const uid = requireAuth(request);
  const orderId = String(request.data?.orderId || "");
  const reference = String(request.data?.reference || "").trim().slice(0, 100);
  const normalizedReference = reference.toUpperCase().replace(/\s+/g, " ");
  const method = String(request.data?.method || "");
  if (!orderId || reference.length < 4) throw new HttpsError("invalid-argument", "Enter a valid payment reference.");
  if (!["maya", "qrph"].includes(method)) throw new HttpsError("invalid-argument", "Unsupported payment method.");
  const referenceClaimId = crypto.createHash("sha256").update(normalizedReference).digest("hex");
  const referenceClaimRef = db.collection("paymentReferenceClaims").doc(referenceClaimId);
  const orderRef = db.collection("paymentOrders").doc(orderId);
  const userOrderRef = db.collection("users").doc(uid).collection("orders").doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists || snap.data().userId !== uid) throw new HttpsError("not-found", "Order not found.");
    if (snap.data().status !== "awaiting_payment") throw new HttpsError("failed-precondition", "Order is no longer awaiting payment.");
    const claimSnap = await tx.get(referenceClaimRef);
    if (claimSnap.exists) throw new HttpsError("already-exists", "This payment reference has already been submitted.");
    const duplicateQuery = db.collection("paymentOrders").where("paymentReference", "==", reference);
    const duplicateSnap = await tx.get(duplicateQuery);
    if (duplicateSnap.docs.some(doc => doc.data().paymentMethod === method && doc.data().status !== "rejected")) throw new HttpsError("already-exists", "This payment reference has already been submitted for this payment method.");
    tx.create(referenceClaimRef, { method, normalizedReference, orderId, userId: uid, claimedAt: FieldValue.serverTimestamp() });
    tx.update(orderRef, { paymentMethod: method, paymentReference: reference, status: "pending_verification", submittedAt: FieldValue.serverTimestamp() });
    tx.update(userOrderRef, { paymentMethod: method, paymentReference: reference, status: "pending_verification", submittedAt: FieldValue.serverTimestamp() });
  });
  return { orderId, status: "pending_verification" };
});

exports.adminVerifyPaymentAndCreditCoins = onCall(async (request) => {
  const adminUid = requireAuth(request);
  if (request.auth.token.admin !== true) throw new HttpsError("permission-denied", "Admin access required.");
  const orderId = String(request.data?.orderId || "");
  const decision = String(request.data?.decision || "");
  if (!orderId || !["approve", "reject"].includes(decision)) throw new HttpsError("invalid-argument", "Invalid order or decision.");

  const orderRef = db.collection("paymentOrders").doc(orderId);
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new HttpsError("not-found", "Payment order not found.");
    const order = orderSnap.data();
    if (order.status !== "pending_verification") throw new HttpsError("failed-precondition", "Order is not awaiting verification.");
    const userId = order.userId;
    const walletRef = db.collection("users").doc(userId).collection("wallet").doc("balance");
    const ledgerRef = db.collection("users").doc(userId).collection("ledger").doc(orderId);
    const userOrderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);
    if (decision === "reject") {
      const claimId=order.paymentReference?crypto.createHash("sha256").update(String(order.paymentReference).trim().toUpperCase().replace(/\\s+/g," ")).digest("hex"):null;
      if(claimId){const claimRef=db.collection("paymentReferenceClaims").doc(claimId);const claimSnap=await tx.get(claimRef);if(claimSnap.exists&&claimSnap.data().orderId===orderId)tx.delete(claimRef);}
      tx.update(orderRef, { status: "rejected", verifiedBy: adminUid, verifiedAt: FieldValue.serverTimestamp() });
      tx.update(userOrderRef, { status: "rejected", verifiedBy: adminUid, verifiedAt: FieldValue.serverTimestamp() });
      return;
    }
    const ledgerSnap = await tx.get(ledgerRef);
    if (ledgerSnap.exists) throw new HttpsError("already-exists", "Coins have already been credited for this order.");
    const walletSnap = await tx.get(walletRef);
    const currentBalance = walletSnap.exists ? Number(walletSnap.data().coins) : 0;
    const credit = Number(order.coins);
    if (!Number.isSafeInteger(currentBalance) || currentBalance < 0) throw new HttpsError("failed-precondition", "Invalid wallet balance.");
    if (!Number.isSafeInteger(credit) || credit <= 0 || !Number.isSafeInteger(currentBalance + credit)) throw new HttpsError("failed-precondition", "Invalid coin credit or balance overflow.");
    tx.set(walletRef, { coins: currentBalance + credit, updatedAt: FieldValue.serverTimestamp() });
    tx.create(ledgerRef, { type: "purchase_credit", orderId, coins: credit, amountPhp: order.pricePhp, method: order.paymentMethod, reference: order.paymentReference, verifiedBy: adminUid, createdAt: FieldValue.serverTimestamp() });
    tx.update(orderRef, { status: "paid", verifiedBy: adminUid, verifiedAt: FieldValue.serverTimestamp() });
    tx.update(userOrderRef, { status: "paid", verifiedBy: adminUid, verifiedAt: FieldValue.serverTimestamp(), paymentMethod: order.paymentMethod, paymentReference: order.paymentReference });
  });
  return { orderId, decision, success: true };
});

// Secure coin debit and episode unlock: 10 coins, idempotent per drama/episode.
exports.spendCoinsAndUnlockEpisode = onCall(async (request) => {
  const uid = requireAuth(request);
  const dramaKey = String(request.data?.dramaKey || "").trim();
  const episodeNumber = Number(request.data?.episodeNumber);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(dramaKey)) throw new HttpsError("invalid-argument", "Invalid drama identifier.");
  if (!Number.isInteger(episodeNumber) || episodeNumber < 6 || episodeNumber > 1000) throw new HttpsError("invalid-argument", "Episodes 1–5 are free; invalid paid episode.");
  const unlockId = dramaKey + "_ep" + episodeNumber;
  const userRef = db.collection("users").doc(uid);
  const walletRef = userRef.collection("wallet").doc("balance");
  const unlockRef = userRef.collection("episodeUnlocks").doc(unlockId);
  const ledgerRef = userRef.collection("ledger").doc("unlock_" + unlockId);
  const result = await db.runTransaction(async (tx) => {
    const [unlockSnap, walletSnap, ledgerSnap] = await Promise.all([tx.get(unlockRef), tx.get(walletRef), tx.get(ledgerRef)]);
    if (unlockSnap.exists) return { alreadyUnlocked: true, balance: Number(walletSnap.exists ? walletSnap.data().coins || 0 : 0) };
    const balance = Number(walletSnap.exists ? walletSnap.data().coins || 0 : 0);
    if (!Number.isSafeInteger(balance) || balance < 0) throw new HttpsError("failed-precondition", "Wallet balance is invalid.");
    if (balance < 10) throw new HttpsError("failed-precondition", "Not enough verified coins.");
    if (ledgerSnap.exists) throw new HttpsError("already-exists", "A ledger entry exists for this unlock.");
    tx.set(walletRef, { coins: balance - 10, updatedAt: FieldValue.serverTimestamp() });
    tx.create(unlockRef, { dramaKey, episodeNumber, coinsSpent: 10, unlockedAt: FieldValue.serverTimestamp() });
    tx.create(ledgerRef, { type: "episode_unlock_debit", dramaKey, episodeNumber, coins: -10, balanceAfter: balance - 10, createdAt: FieldValue.serverTimestamp() });
    return { alreadyUnlocked: false, balance: balance - 10 };
  });
  return { dramaKey, episodeNumber, coinsSpent: result.alreadyUnlocked ? 0 : 10, alreadyUnlocked: result.alreadyUnlocked, balance: result.balance };
});

// Server-authoritative check; never trust localStorage for paid episode access.
exports.verifyEpisodeUnlock = onCall(async (request) => {
  const uid = requireAuth(request);
  const dramaKey = String(request.data?.dramaKey || "").trim();
  const episodeNumber = Number(request.data?.episodeNumber);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(dramaKey)) throw new HttpsError("invalid-argument", "Invalid drama identifier.");
  if (!Number.isInteger(episodeNumber) || episodeNumber < 6 || episodeNumber > 1000) throw new HttpsError("invalid-argument", "Invalid paid episode.");
  const unlockId = dramaKey + "_ep" + episodeNumber;
  const snap = await db.collection("users").doc(uid).collection("episodeUnlocks").doc(unlockId).get();
  return { unlocked: snap.exists, dramaKey, episodeNumber };
});
