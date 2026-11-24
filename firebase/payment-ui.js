/* NEXORA 11.1 Firebase payment UI — manual Maya/QR Ph verification, no GCash */
(function(){
 const packs={starter:{coins:500,price:49},value:{coins:1200,price:99},premium:{coins:3000,price:199}};
 let currentOrder=null,currentOrderUid=null,paymentMethod="maya";
 const config=window.NEXORA_PAYMENT_DETAILS||{};
 function el(tag,attrs={},children=[]){const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==="text")n.textContent=v;else if(k==="html")n.innerHTML=v;else n.setAttribute(k,v)});children.forEach(c=>n.append(c));return n;}
 function toastMsg(m){if(typeof window.toast==="function")window.toast(m);else console.info("[NEXORA]",m);}
 function ready(){return !!window.NX_FIREBASE_READY&&!!window.nxFirebaseFunctions&&!!window.nxFirebaseAuth;}
 function paymentConfigured(method){const qr=method==="maya"?config.mayaQrImageUrl:config.qrPhImageUrl;const receiver=method==="maya"?config.mayaDisplayName:config.qrPhDisplayName;return typeof qr==="string"&&/^https:\/\/[^\s]+$/i.test(qr)&&typeof receiver==="string"&&receiver.trim().length>0;}
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
  if(!paymentConfigured(paymentMethod)){if(paymentConfigured("qrph"))paymentMethod="qrph";else if(paymentConfigured("maya"))paymentMethod="maya";else{status("Maya and QR Ph receiver details/QR images are not configured. No order was created.");toastMsg("Payments are disabled until the real payment QR details are configured.");return;}}
  if(!window.nxFirebaseAuth.currentUser){firebaseAuthForm(()=>startOrder(packageId));return;}
  status("Creating payment order…");
  const creatingUid=window.nxFirebaseAuth.currentUser?.uid||null;
  if(!creatingUid){status("Sign in before creating a payment order.");return;}
  try{const call=window.nxFirebaseFunctions.httpsCallable("createCoinOrder");const res=await call({packageId});if(window.nxFirebaseAuth.currentUser?.uid!==creatingUid){currentOrder=null;currentOrderUid=null;status("Account changed while the order was being created. Sign in again and start a new order.");toastMsg("Order cancelled because the account changed.");return;}currentOrder=res.data;currentOrderUid=creatingUid;paymentMethod=paymentConfigured("maya")?"maya":"qrph";showPayment();}
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
  const html='<h3>Order '+safeOrder+'</h3><p>Package: <b>'+pack.coins.toLocaleString()+' coins</b> · Amount <b>₱'+pack.price+'</b></p><div style="display:flex;gap:8px"><button id="nxMethodMaya" class="chip" style="flex:1" ${paymentConfigured("maya")?"":"disabled"}>Maya</button><button id="nxMethodQr" class="chip" style="flex:1" ${paymentConfigured("qrph")?"":"disabled"}>QR Ph</button></div><div style="margin:12px 0;padding:12px;background:#22222b;border-radius:12px;text-align:center"><b>Pay to: '+receiver+'</b>'+(imageUrl?'<img src="'+imageUrl+'" alt="Payment QR" style="display:block;max-width:230px;width:100%;margin:12px auto;border-radius:8px">':'<p style="color:#f5a7b5;font-size:13px">Payment QR not configured. Do not pay until the real QR image and receiver details are added.</p>')+'<p style="color:#aaa;font-size:12px">No GCash. Coins are credited only after payment is verified.</p></div><label>Payment reference number</label><input id="nxPayReference" placeholder="Enter transaction reference" style="display:block;width:100%;padding:12px;background:#101018;border:1px solid #333;color:white;border-radius:9px;margin:8px 0"><button id="nxPaySubmitRef" class="btn" style="width:100%" '+(!imageUrl?'disabled':'')+'>Submit for verification</button><p id="nxPaySubmitStatus" style="color:#bbb;font-size:12px"></p>';
  showContent(html);
  modal().querySelector("#nxMethodMaya").disabled=!!currentOrder.referenceSubmitted;modal().querySelector("#nxMethodQr").disabled=!!currentOrder.referenceSubmitted;
  modal().querySelector("#nxMethodMaya").onclick=()=>{if(currentOrder.referenceSubmitted)return;paymentMethod="maya";showPayment();};
  modal().querySelector("#nxMethodQr").onclick=()=>{if(currentOrder.referenceSubmitted)return;paymentMethod="qrph";showPayment();};
  const submit=modal().querySelector("#nxPaySubmitRef");if(submit)submit.onclick=submitReference;
 }
 let nxPaymentSubmitting=false;async function submitReference(){
  const input=modal().querySelector("#nxPayReference"),submit=modal().querySelector("#nxPaySubmitRef"),ref=input.value.trim(),msg=modal().querySelector("#nxPaySubmitStatus"),orderId=currentOrder?.orderId,method=paymentMethod;
  if(nxPaymentSubmitting)return;if(!orderId){msg.textContent="No active order. Create a new order first.";return;}if(!currentOrderUid||window.nxFirebaseAuth.currentUser?.uid!==currentOrderUid){currentOrder=null;currentOrderUid=null;msg.textContent="Account changed. Create a new payment order after signing in.";if(submit)submit.disabled=true;status("Payment order belongs to a previous account. Start a new order.");return;}
  if(ref.length<4){msg.textContent="Please enter your payment reference.";return;}
  nxPaymentSubmitting=true;if(submit)submit.disabled=true;const mayaBtn=modal().querySelector("#nxMethodMaya"),qrBtn=modal().querySelector("#nxMethodQr");if(mayaBtn)mayaBtn.disabled=true;if(qrBtn)qrBtn.disabled=true;
  msg.textContent="Submitting reference…";
  try{const submitUid=currentOrderUid;const call=window.nxFirebaseFunctions.httpsCallable("submitPaymentReference");await call({orderId,reference:ref,method});if(window.nxFirebaseAuth.currentUser?.uid!==submitUid||currentOrderUid!==submitUid||currentOrder?.orderId!==orderId){currentOrder=null;currentOrderUid=null;status("Account changed while submitting payment reference. Check the original account order status before retrying.");msg.textContent="Account changed during submission. This reference may have reached verification; check the original account order history before submitting again.";if(input)input.disabled=true;if(submit)submit.disabled=true;return;}currentOrder.referenceSubmitted=true;msg.textContent="Submitted. Coins will be added after manual payment verification.";if(input)input.disabled=true;if(submit)submit.textContent="Reference submitted";status("Payment submitted for verification · Order "+orderId);toastMsg("Payment reference submitted.");}
  catch(e){console.error("NEXORA payment reference error",e);if(currentOrder?.orderId===orderId){msg.textContent=e.message||"Could not submit reference. Please retry.";if(submit)submit.disabled=false;}}
  finally{nxPaymentSubmitting=false;if(currentOrder?.orderId===orderId){if(mayaBtn)mayaBtn.disabled=!!currentOrder.referenceSubmitted;if(qrBtn)qrBtn.disabled=!!currentOrder.referenceSubmitted;}}
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
 function renderFirebaseOrders(rows,balance){const target=document.getElementById("nxWalletHistory");if(!target)return;
 const balanceText=Number.isFinite(balance)?balance.toLocaleString():"Unavailable";
 const orderHtml=rows.length?rows.map(o=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #292932;font-size:12px"><span>'+escapeHtml(o.coins+' coins · ₱'+o.pricePhp)+'<br><small style="color:#888">'+escapeHtml(o.orderId)+'</small></span><span style="text-align:right;color:'+(o.status==="paid"?"#7de2a5":o.status==="rejected"?"#ff9aab":"#d8c27a")+'">'+escapeHtml(statusLabel(o.status))+'</span></div>').join(""):'<p style="color:#999;font-size:12px">No Firebase coin orders yet.</p>';
 target.innerHTML='<div style="padding:12px;background:#20202a;border:1px solid #373743;border-radius:12px;margin-bottom:10px"><small style="color:#999">SERVER-VERIFIED COIN BALANCE</small><div style="font-size:26px;font-weight:900;margin-top:4px">🪙 '+escapeHtml(balanceText)+' coins</div><p style="font-size:11px;color:#aaa;margin:5px 0 0">This balance is from Firebase, not demo coins.</p></div><div style="font-weight:700;margin:10px 0">Firebase orders (latest 10)</div>'+orderHtml;}
 let nxWalletRefreshSeq=0;async function nxRefreshFirebaseWallet(){const historyEl=document.getElementById("nxWalletHistory");if(!ready()){status("Firebase not configured. Live wallet/order tracking is disabled.");if(historyEl)historyEl.textContent="Firebase setup is pending.";return;}
 const user=window.nxFirebaseAuth.currentUser;if(!user){nxWalletRefreshSeq++;status("Sign in to Firebase to check your server wallet and order history.");if(historyEl)historyEl.textContent="Firebase sign-in is required for order history.";return;}const refreshSeq=++nxWalletRefreshSeq;
 status("Refreshing Firebase wallet and orders…");try{const db=window.nxFirebaseDb;
 const walletRef=db.collection("users").doc(user.uid).collection("wallet").doc("balance");const ordersRef=db.collection("users").doc(user.uid).collection("orders");const [walletSnap,ordersSnap]=await Promise.all([walletRef.get(),ordersRef.orderBy("createdAt","desc").limit(10).get()]);if(refreshSeq!==nxWalletRefreshSeq||window.nxFirebaseAuth.currentUser?.uid!==user.uid)return;const rawBalance=walletSnap.exists?Number(walletSnap.data().coins):0;if(!Number.isSafeInteger(rawBalance)||rawBalance<0){status("Wallet data is invalid. Coin balance is not displayed as verified.");if(historyEl)historyEl.textContent="Invalid wallet balance data.";return;}const balance=rawBalance;
 status("Firebase verified wallet: "+balance.toLocaleString()+" coins · server ledger wallet (demo balance is separate).");const rows=ordersSnap.docs.map(d=>({orderId:d.id,...d.data()}));renderFirebaseOrders(rows,balance);
 }catch(e){console.error("NEXORA Firebase wallet refresh error",e);if(refreshSeq!==nxWalletRefreshSeq||window.nxFirebaseAuth.currentUser?.uid!==user.uid)return;status("Wallet refresh failed. Check Firebase configuration and Firestore rules.");if(historyEl)historyEl.textContent="Unable to load Firebase orders.";} }
 window.nxRefreshWallet=nxRefreshFirebaseWallet;
 // The main viewer auth-state listener owns wallet refreshes; do not register a second listener here.
 // Avoid duplicate wallet reads/rendering and competing status messages during sign-in/sign-out.

})();