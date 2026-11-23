const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
const scripts=[...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
if(!scripts.length)throw new Error("No inline scripts found");
scripts.forEach((source,i)=>{try{new vm.Script(source,{filename:"index.html:inline-script-"+(i+1)});}catch(e){console.error(e.message);process.exitCode=1;}});
const required=["nxStartCheckout('starter')","nxStartCheckout('value')","nxStartCheckout('premium')","async function nxRefreshWallet","nxSupabase.functions.invoke(\"nx-create-checkout\""];
for(const needle of required)if(!html.includes(needle)){console.error("Missing required checkout wiring: "+needle);process.exitCode=1;}
if(html.includes("DEMO PURCHASES")||html.includes("buyDemoCoins(50)")){console.error("Old demo coin-shop buttons still present.");process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log("Web validation passed: "+scripts.length+" inline scripts syntax-checked; checkout UI wiring verified.");
