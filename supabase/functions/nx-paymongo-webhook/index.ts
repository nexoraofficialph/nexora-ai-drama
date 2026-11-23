// Supabase Edge Function: signed PayMongo webhook receiver.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function constantTimeEqual(a:string,b:string):boolean {
  if(a.length!==b.length)return false;
  let mismatch=0;
  for(let i=0;i<a.length;i++) mismatch |= a.charCodeAt(i)^b.charCodeAt(i);
  return mismatch===0;
}
function hex(bytes:ArrayBuffer):string {
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function verifySignature(raw:string,header:string,secret:string,mode:string):Promise<boolean>{
  const parts:Record<string,string>={};
  for(const chunk of header.split(",")){const [k,v]=chunk.trim().split("=",2);if(k&&v)parts[k]=v;}
  const ts=parts.t,signature=mode==="live"?parts.li:parts.te;
  if(!ts||!signature)return false;
  const timestamp=Number(ts);
  if(!Number.isFinite(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const expected=hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(ts+"."+raw)));
  return constantTimeEqual(expected,signature.toLowerCase());
}
serve(async(req)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  const secret=Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  const mode=Deno.env.get("PAYMONGO_MODE")||"test";
  if(!secret||!["test","live"].includes(mode))return new Response("Payment webhook is not configured",{status:500});
  const raw=await req.text();
  const header=req.headers.get("Paymongo-Signature")||req.headers.get("paymongo-signature")||"";
  if(!await verifySignature(raw,header,secret,mode))return new Response("Invalid signature",{status:401});
  try{
    const payload=JSON.parse(raw);
    const eventAttrs=payload?.data?.attributes;
    if(eventAttrs?.type!=="checkout_session.payment.paid")return new Response("Ignored event",{status:200});
    if(Boolean(eventAttrs?.livemode)!==(mode==="live"))return new Response("Mode mismatch",{status:400});
    const session=eventAttrs?.data;
    const attrs=session?.attributes||{};
    const orderId=attrs.reference_number;
    const sessionId=session?.id;
    const payment=(attrs.payments||[]).find((p:any)=>p?.attributes?.status==="paid");
    const paymentAttrs=payment?.attributes||{};
    if(!orderId||!sessionId||!payment?.id||!Number.isInteger(paymentAttrs.amount)||!paymentAttrs.currency)
      return new Response("Missing paid transaction fields",{status:400});
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {error}=await admin.rpc("nx_credit_paid_order",{
      p_order_id:orderId,p_session_id:sessionId,p_payment_id:payment.id,
      p_amount:paymentAttrs.amount,p_currency:paymentAttrs.currency
    });
    if(error){console.error("Order credit rejected",error);return new Response("Order verification failed",{status:400});}
    return new Response("ok",{status:200});
  }catch(err){console.error("Webhook processing error",err);return new Response("Invalid event payload",{status:400});}
});