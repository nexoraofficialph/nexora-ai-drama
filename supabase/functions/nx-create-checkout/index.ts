// Supabase Edge Function: authenticated PayMongo Hosted Checkout creator.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const PACKAGES: Record<string, {coins:number; price:number}> = {
  starter: { coins: 500, price: 4900 },
  value: { coins: 1200, price: 9900 },
  premium: { coins: 3000, price: 19900 },
};
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({error:"method_not_allowed"}), {status:405,headers:cors});
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paymongoSecret = Deno.env.get("PAYMONGO_SECRET_KEY");
    if (!paymongoSecret) throw new Error("Payment backend is not configured.");
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({error:"unauthorized"}), {status:401,headers:cors});
    const userClient = createClient(supabaseUrl, anonKey, {global:{headers:{Authorization:auth}}});
    const {data:{user},error:userErr} = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({error:"unauthorized"}), {status:401,headers:cors});
    const {packageId} = await req.json();
    const pack = PACKAGES[String(packageId)];
    if (!pack) return new Response(JSON.stringify({error:"invalid_package"}), {status:400,headers:cors});
    const admin = createClient(supabaseUrl, serviceKey);
    const {data:order,error:dbErr} = await admin.from("nx_payment_orders").insert({
      user_id:user.id, package_id:packageId, coins:pack.coins, amount_centavos:pack.price, status:"pending"
    }).select("id").single();
    if (dbErr || !order) throw new Error("Unable to create payment order.");
    const basic = btoa(paymongoSecret + ":");
    const response = await fetch("https://api.paymongo.com/v2/checkout_sessions",{
      method:"POST", headers:{Authorization:"Basic "+basic,"Content-Type":"application/json"},
      body:JSON.stringify({data:{attributes:{
        line_items:[{name:`NEXORA Coins (${pack.coins})`,amount:pack.price,currency:"PHP",quantity:1}],
        payment_method_types:["gcash","paymaya","qrph"],
        success_url:Deno.env.get("NX_PAYMENT_SUCCESS_URL") || "https://nexora-ai-drama.web.app/payment-success",
        cancel_url:Deno.env.get("NX_PAYMENT_CANCEL_URL") || "https://nexora-ai-drama.web.app/profile",
        reference_number:order.id,
        metadata:{order_id:order.id,user_id:user.id,package_id:packageId,coin_amount:String(pack.coins)}
      }}})
    });
    const body = await response.json();
    if (!response.ok || !body?.data?.attributes?.checkout_url) {
      await admin.from("nx_payment_orders").update({status:"failed"}).eq("id",order.id);
      throw new Error("Payment provider could not start checkout.");
    }
    await admin.from("nx_payment_orders").update({checkout_session_id:body.data.id}).eq("id",order.id);
    return new Response(JSON.stringify({checkoutUrl:body.data.attributes.checkout_url,orderId:order.id}),{status:200,headers:cors});
  } catch (err) {
    console.error("nx-create-checkout error",err);
    return new Response(JSON.stringify({error:err instanceof Error ? err.message : "checkout_failed"}),{status:500,headers:cors});
  }
});