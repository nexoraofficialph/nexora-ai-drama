const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
if(!scripts.length)throw new Error("No inline scripts found");
scripts.forEach((source,i)=>{try{new vm.Script(source,{filename:"index.html:inline-script-"+(i+1)});}catch(e){console.error("Inline script "+(i+1)+" syntax error:",e.stack);process.exitCode=1;}});
const required=["nxStartCheckout('starter')","nxStartCheckout('value')","nxStartCheckout('premium')","async function nxRefreshWallet","nxSupabase.functions.invoke(\"nx-create-checkout\""];
for(const needle of required)if(!html.includes(needle)){console.error("Missing required checkout wiring: "+needle);process.exitCode=1;}
if(html.includes("DEMO PURCHASES")||html.includes("buyDemoCoins(50)")){console.error("Old demo coin-shop buttons still present.");process.exitCode=1;}
const declared=new Set([...html.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
const handlers=[...html.matchAll(/onclick\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
const called=new Set();
for(const handler of handlers)for(const m of handler.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)){if(!["if","toast"].includes(m[1]))called.add(m[1]);}
const missing=[...called].filter(name=>!declared.has(name));
if(missing.length){console.error("Inline button handlers without matching function declaration:",missing.join(", "));process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log("Web validation passed: "+scripts.length+" inline scripts syntax-checked; "+handlers.length+" button handlers checked; checkout wiring verified.");
