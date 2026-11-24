const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
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
  const method = String(request.data?.method || "");
  if (!orderId || reference.length < 4) throw new HttpsError("invalid-argument", "Enter a valid payment reference.");
  if (!["maya", "qrph"].includes(method)) throw new HttpsError("invalid-argument", "Unsupported payment method.");
  const orderRef = db.collection("paymentOrders").doc(orderId);
  const userOrderRef = db.collection("users").doc(uid).collection("orders").doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists || snap.data().userId !== uid) throw new HttpsError("not-found", "Order not found.");
    if (snap.data().status !== "awaiting_payment") throw new HttpsError("failed-precondition", "Order is no longer awaiting payment.");
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
      tx.update(orderRef, { status: "rejected", verifiedBy: adminUid, verifiedAt: FieldValue.serverTimestamp() });
      tx.update(userOrderRef, { status: "rejected", verifiedAt: FieldValue.serverTimestamp() });
      return;
    }
    const ledgerSnap = await tx.get(ledgerRef);
    if (ledgerSnap.exists) throw new HttpsError("already-exists", "Coins have already been credited for this order.");
    const walletSnap = await tx.get(walletRef);
    const currentBalance = walletSnap.exists ? Number(walletSnap.data().coins || 0) : 0;
    const credit = Number(order.coins);
    if (!Number.isInteger(credit) || credit <= 0) throw new HttpsError("failed-precondition", "Invalid coin amount.");
    tx.set(walletRef, { coins: currentBalance + credit, updatedAt: FieldValue.serverTimestamp() });
    tx.create(ledgerRef, { type: "purchase_credit", orderId, coins: credit, amountPhp: order.pricePhp, method: order.paymentMethod, reference: order.paymentReference, verifiedBy: adminUid, createdAt: FieldValue.serverTimestamp() });
    tx.update(orderRef, { status: "paid", verifiedBy: adminUid, verifiedAt: FieldValue.serverTimestamp() });
    tx.update(userOrderRef, { status: "paid", verifiedAt: FieldValue.serverTimestamp() });
  });
  return { orderId, decision, success: true };
});
