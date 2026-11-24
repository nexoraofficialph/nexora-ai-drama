/* NEXORA 11.1 Firebase payment UI — manual Maya/QR Ph verification, no GCash */
(function(){
 const packs={starter:{coins:500,price:49},value:{coins:1200,price:99},premium:{coins:3000,price:199}};
 let currentOrder=null, paymentMethod="maya";
 const config=window.NEXORA_PAYMENT_DETAILS||{};
 function el(tag,attrs={},children=[]){const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==="text")n.textContent=v;else if(k==="html")n.innerHTML=v;else n.setAttribute(k,v)});children.forEach(c=>n.append(c));return n;}
 function toastMsg(m){if(typeof window.toast==="function")window.toast(m);else console.info("[NEXORA]",m);}
 function ready(){return !!window.NX_FIREBASE_READY&&!!window.nxFirebaseFunctions&&!!window.nxFirebaseAuth;}
 function getShop(){return document.getElementById("nxCoinShop");}
 function ensureStatus(){let s=document.getElementById("nxPaymentStatus");if(!s){s=el("div",{id:"nxPaymentStatus","aria-live":"polite"});getShop()?.append(s);}return s;}
 function status(m){const s=ensureStatus();if(s)s.textContent=m;}
 function modal(){let m=document.getElementById("nxPayModal");if(!m){m=el("div",{id:"nxPayModal"});m.style.cssText="position:fixed;inset:0;z-index:9999;background:#000b;display:none;align-items:flex-end;justify-content:center;font-family:inherit;color:#f5f5f8";
 const box=el("div");box.style.cssText="width:min(100%,540px);max-height:90vh;overflow:auto;background:#15151d;border:1px solid #383842;border-radius:20px 20px 0 0;padding:20px 18px calc(24px + env(safe-area-inset-bottom))";
 const close=el("button",{text:"Close"});close.className="chip";close.style.cssText="float:right";close.onclick=()=>m.style.display="none";
 box.append(close,el("h2",{text:"NEXORA Coin Payment"}),el("div",{id:"nxPayModalContent"}));m.append(box);document.body.append(m);}return m;}
 function showContent(html){modal().querySelector("#nxPayModalContent").innerHTML=html;modal().style.display="flex";}
 function firebaseAuthForm(next){
  const auth=window.nxFirebaseAuth;
  showContent('<h3>Sign in to Firebase</h3><p style="color:#aaa;font-size:13px">For payment orders, sign in using your email. If your app account uses a different authentication system, it must be connected to Firebase before purchasing.</p><label>Email</label><input id="nxPayEmail" type="email" autocomplete="email" style="display:block;width:100%;padding:12px;background:#101018;border:1px solid #333;color:white;border-radius:9px;margin:8px 0"><label>Password</label><input id="nxPayPassword" type="password" autocomplete="current-password" style="display:block;width:100%;padding:12px;background:#101018;border:1px solid #333;color:white;border-radius:9px;margin:8px 0"><button id="nxPayLogin" class="btn" style="width:100%;margin:8px 0">Log in</button><button id="nxPaySignup" class="chip" style="width:100%">Create Firebase account</button><p id="nxPayAuthError" style="font-size:12px;color:#ff9aab"></p>');
  const err=modal().querySelector("#nxPayAuthError");
  async function authRun(signup){const email=modal().querySelector("#nxPayEmail").value.trim(),password=modal().querySelector("#nxPayPassword").value;if(!email||password.length<6){err.textContent="Enter a valid email and password (minimum 6 characters).";return;}try{if(signup)await auth.createUserWithEmailAndPassword(email,password);else await auth.signInWithEmailAndPassword(email,password);next();}catch(e){err.textContent=e.message||"Authentication failed";}}
  modal().querySelector("#nxPayLogin").onclick=()=>authRun(false);modal().querySelector("#nxPaySignup").onclick=()=>authRun(true);
 }
 async function startOrder(packageId){
  if(!ready()){status("Firebase is not configured. Payment ordering is unavailable.");toastMsg("Firebase setup is required first.");return;}
  if(!packs[packageId])return;
  if(!window.nxFirebaseAuth.currentUser){firebaseAuthForm(()=>startOrder(packageId));return;}
  status("Creating payment order…");
  try{const call=window.nxFirebaseFunctions.httpsCallable("createCoinOrder");const res=await call({packageId});currentOrder=res.data;paymentMethod="maya";showPayment();}
  catch(e){console.error("NEXORA createCoinOrder error",e);status("Could not create order. Try again.");toastMsg("Order creation failed.");}
 }
 function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function showPayment(){
  const pack=packs[currentOrder.packageId];if(!pack)return;
  const rawUrl=paymentMethod==="maya"?config.mayaQrImageUrl:config.qrPhImageUrl;
  const imageUrl=typeof rawUrl==="string"&&/^https:\/\/[^\s"'<>]+$/i.test(rawUrl)?rawUrl:"";
  const rawReceiver=paymentMethod==="maya"?(config.mayaDisplayName||"Maya receiver not configured"):(config.qrPhDisplayName||"QR Ph receiver not configured");
  const receiver=escapeHtml(rawReceiver);
  const safeOrder=escapeHtml(currentOrder.orderId);
  const html='<h3>Order '+safeOrder+'</h3><p>Package: <b>'+pack.coins.toLocaleString()+' coins</b> · Amount <b>₱'+pack.price+'</b></p><div style="display:flex;gap:8px"><button id="nxMethodMaya" class="chip" style="flex:1">Maya</button><button id="nxMethodQr" class="chip" style="flex:1">QR Ph</button></div><div style="margin:12px 0;padding:12px;background:#22222b;border-radius:12px;text-align:center"><b>Pay to: '+receiver+'</b>'+(imageUrl?'<img src="'+imageUrl+'" alt="Payment QR" style="display:block;max-width:230px;width:100%;margin:12px auto;border-radius:8px">':'<p style="color:#f5a7b5;font-size:13px">Payment QR not configured. Do not pay until the real QR image and receiver details are added.</p>')+'<p style="color:#aaa;font-size:12px">No GCash. Coins are credited only after payment is verified.</p></div><label>Payment reference number</label><input id="nxPayReference" placeholder="Enter transaction reference" style="display:block;width:100%;padding:12px;background:#101018;border:1px solid #333;color:white;border-radius:9px;margin:8px 0"><button id="nxPaySubmitRef" class="btn" style="width:100%" '+(!imageUrl?'disabled':'')+'>Submit for verification</button><p id="nxPaySubmitStatus" style="color:#bbb;font-size:12px"></p>';
  showContent(html);
  modal().querySelector("#nxMethodMaya").onclick=()=>{paymentMethod="maya";showPayment();};
  modal().querySelector("#nxMethodQr").onclick=()=>{paymentMethod="qrph";showPayment();};
  const submit=modal().querySelector("#nxPaySubmitRef");if(submit)submit.onclick=submitReference;
 }
 async function submitReference(){
  const ref=modal().querySelector("#nxPayReference").value.trim(),msg=modal().querySelector("#nxPaySubmitStatus");
  if(ref.length<4){msg.textContent="Please enter your payment reference.";return;}
  msg.textContent="Submitting reference…";
  try{const call=window.nxFirebaseFunctions.httpsCallable("submitPaymentReference");await call({orderId:currentOrder.orderId,reference:ref,method:paymentMethod});msg.textContent="Submitted. Coins will be added after manual payment verification.";status("Payment submitted for verification · Order "+currentOrder.orderId);toastMsg("Payment reference submitted.");}
  catch(e){console.error("NEXORA payment reference error",e);msg.textContent=e.message||"Could not submit reference. Please retry.";}
 }
 // Override old Supabase direct-checkout buttons so users cannot be sent to a missing gateway.
 window.nxStartCheckout=startOrder;
 // Add safe UI indicator and prevent demo reward claim from being confused with a real balance.
 document.addEventListener("DOMContentLoaded",()=>{
  const shop=getShop();if(!shop)return;
  const tag=shop.querySelector("span");if(tag){tag.textContent="MAYA + QR PH · MANUAL VERIFY";}
  if(!ready())status("Firebase not configured yet. Coin purchases are disabled; configure Firebase first.");
  else status("Firebase payment orders ready. Add payment QR details before enabling payment.");
 });
 // NEXORA 11.2: server-wallet and payment-order status panel.
 function statusLabel(s){return ({awaiting_payment:"Awaiting payment",pending_verification:"Pending verification",paid:"Paid · coins credited",rejected:"Payment rejected"})[s]||String(s||"Unknown");}
 function renderFirebaseOrders(rows){const target=document.getElementById("nxWalletHistory");if(!target)return;
 if(!rows.length){target.textContent="No Firebase coin orders yet.";return;}
 target.innerHTML='<div style="font-weight:700;margin-bottom:8px">Firebase orders</div>'+rows.map(o=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #292932;font-size:12px"><span>'+escapeHtml(o.coins+' coins · ₱'+o.pricePhp)+'<br><small style="color:#888">'+escapeHtml(o.orderId)+'</small></span><span style="text-align:right;color:'+(o.status==="paid"?"#7de2a5":o.status==="rejected"?"#ff9aab":"#d8c27a")+'">'+escapeHtml(statusLabel(o.status))+'</span></div>').join("");}
 async function nxRefreshFirebaseWallet(){const historyEl=document.getElementById("nxWalletHistory");if(!ready()){status("Firebase not configured. Live wallet/order tracking is disabled.");if(historyEl)historyEl.textContent="Firebase setup is pending.";return;}
 const user=window.nxFirebaseAuth.currentUser;if(!user){status("Sign in to Firebase to check your server wallet and order history.");if(historyEl)historyEl.textContent="Firebase sign-in is required for order history.";return;}
 status("Refreshing Firebase wallet and orders…");try{const db=window.nxFirebaseDb;
 const walletRef=db.collection("users").doc(user.uid).collection("wallet").doc("balance");const ordersRef=db.collection("users").doc(user.uid).collection("orders");const [walletSnap,ordersSnap]=await Promise.all([walletRef.get(),ordersRef.orderBy("createdAt","desc").limit(10).get()]);const balance=walletSnap.exists?Number(walletSnap.data().coins||0):0;
 status("Firebase verified wallet: "+balance.toLocaleString()+" coins · server ledger wallet (demo balance is separate).");const rows=ordersSnap.docs.map(d=>({orderId:d.id,...d.data()}));renderFirebaseOrders(rows);
 }catch(e){console.error("NEXORA Firebase wallet refresh error",e);status("Wallet refresh failed. Check Firebase configuration and Firestore rules.");if(historyEl)historyEl.textContent="Unable to load Firebase orders.";} }
 window.nxRefreshWallet=nxRefreshFirebaseWallet;
 if(window.nxFirebaseAuth){window.nxFirebaseAuth.onAuthStateChanged(user=>{if(user){status("Firebase signed in · refreshing secure wallet…");nxRefreshFirebaseWallet();}else{status("Sign in to Firebase to view wallet/order history.");const h=document.getElementById("nxWalletHistory");if(h)h.textContent="Firebase sign-in is required for order history.";}});}
 // Replace Firebase auth modal copy with a clear warning that it is currently separate from app/Supabase login.

})();