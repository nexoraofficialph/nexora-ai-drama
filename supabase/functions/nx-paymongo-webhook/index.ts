// Supabase Edge Function: PayMongo webhook. Configure PAYMONGO_WEBHOOK_SECRET as the webhook signing secret.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
function hex(buf: ArrayBuffer) { return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function verifySignature(raw: string, header: string, secret: string) {
  const parts=Object.fromEntries(header.split(",").map(s=>s.trim().split("=",2)));
  const timestamp=parts.t; const test=parts.te; const live=parts.li;
  if(!timestamp || !(test||live)) return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const expected=hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(timestamp+"."+raw)));
  const received=(Deno.env.get("PAYMONGO_MODE")==="live"?live:test)||"";
  if(received.length!==expected.length)return false;
  let diff=0; for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^received.charCodeAt(i); return diff===0;
}
serve(async(req)=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const secret=Deno.env.get("PAYMONGO_WEBHOOK_SECRET"); if(!secret)return new Response("Missing webhook secret",{status:500});
 const raw=await req.text(); const signature=req.headers.get("Paymongo-Signature")||req.headers.get("paymongo-signature")||"";
 if(!await verifySignature(raw,signature,secret))return new Response("Invalid signature",{status:401});
 try{
  const payload=JSON.parse(raw); const event=payload?.data;
  if(event?.attributes?.type!=="checkout_session.payment.paid")return new Response("Ignored",{status:200});
  const session=event?.attributes?.data; const attrs=session?.attributes||{};
  const orderId=attrs.reference_number; const sessionId=session?.id;
  const paidPayment=(attrs.payments||[]).find((p:any)=>p?.attributes?.status==="paid");
  const payId=paidPayment?.id;
  if(!orderId||!sessionId||!payId)return new Response("Missing payment reference",{status:400});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {error}=await admin.rpc("nx_credit_paid_order",{p_order_id:orderId,p_session_id:sessionId,p_payment_id:payId});
  if(error){console.error("Coin credit RPC error",error);return new Response("Credit processing failed",{status:500});}
  return new Response("ok",{status:200});
 }catch(e){console.error("Webhook handler error",e);return new Response("Bad payload",{status:400});}
});