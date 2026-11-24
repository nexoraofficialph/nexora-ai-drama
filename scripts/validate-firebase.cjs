const fs=require("node:fs");
const functions=fs.readFileSync("firebase/functions/index.js","utf8");
const rules=fs.readFileSync("firebase/firestore.rules","utf8");
const html=fs.readFileSync("index.html","utf8");
const requiredFunctions=["createCoinOrder","submitPaymentReference","adminVerifyPaymentAndCreditCoins","spendCoinsAndUnlockEpisode","verifyEpisodeUnlock"];
for(const name of requiredFunctions)if(!functions.includes("exports."+name+" = onCall"))throw new Error("Missing callable Firebase function: "+name);
const assertions=[
 ["callable authentication guard","requireAuth(request)"],
 ["server-owned coin package prices","const PACKAGES = Object.freeze"],
 ["order status before payment reference submission",'status !== "awaiting_payment"'],
 ["unique payment-reference claim","paymentReferenceClaims"],
 ["provider-independent reference hashing","update(normalizedReference)"],
 ["claim ID excludes provider/method scope","update(normalizedReference).digest(\"hex\")"],
 ["rejection releases normalized reference claim","update(String(order.paymentReference)"],
 ["admin-only approval","request.auth.token.admin !== true"],
 ["credit ledger idempotency","ledgerSnap.exists"],
 ["wallet credit in server transaction","tx.set(walletRef"],
 ["paid episode minimum is episode six","episodeNumber < 6"],
 ["unlock transaction records entitlement","tx.create(unlockRef"],
 ["server entitlement verification","verifyEpisodeUnlock"]
];
for(const [label,needle] of assertions)if(!functions.includes(needle))throw new Error("Firebase invariant missing: "+label+" ("+needle+")");
if(!rules.includes("allow write: if false"))throw new Error("Firestore rules missing client write denial");
if(!rules.includes("request.resource.data.updatedAt is timestamp"))throw new Error("My List rules must validate server timestamp type");
for(const path of ["wallet/{docId}","orders/{orderId}","ledger/{entryId}","episodeUnlocks/{unlockId}","paymentOrders/{orderId}"])if(!rules.includes(path))throw new Error("Firestore rules missing protected path "+path);
if(!html.includes("async function nxStartCheckout(packageId)")||!html.includes("Checkout is paused"))throw new Error("Checkout pause state not clearly guarded in app");
const claimReleaseStart=functions.indexOf("const claimId=order.paymentReference");
const rejectionBranch=functions.slice(claimReleaseStart,functions.indexOf("tx.update(orderRef",claimReleaseStart));
if(claimReleaseStart<0||!rejectionBranch.includes("trim().toUpperCase().replace("))throw new Error("Payment-reference claim release normalization mismatch");





if(functions.includes("\\n      if(claimId)"))throw new Error("Malformed escaped newline in payment claim rejection branch");
console.log("Firebase static audit passed: callable handlers, auth checks, payment reference protections, admin verification, ledger idempotency, episode unlock transactions, and client write-deny rules.");
