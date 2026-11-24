const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
if(!scripts.length)throw new Error("No inline scripts found");
scripts.forEach((source,i)=>{try{new vm.Script(source,{filename:"index.html:inline-script-"+(i+1)});}catch(e){console.error("Inline script "+(i+1)+" syntax error:",e.stack);process.exitCode=1;}});
const required=[
 "accountSignIn()","accountSignUp()","accountResetPassword()","accountSignOut()",
 "nxFirebaseAuth.signInWithEmailAndPassword","nxFirebaseAuth.createUserWithEmailAndPassword",
 "nxFirebaseAuth.sendPasswordResetEmail","nxFirebaseAuth.signOut()",
 "function cloudSyncList(","savedDramaKeys","nxRefreshWallet",
 "async function playEpisode(","verifyEpisodeUnlock","spendCoinsAndUnlockEpisode"
];
for(const needle of required)if(!html.includes(needle)){console.error("Missing required app/Firebase/playback wiring: "+needle);process.exitCode=1;}
if(/supabase/i.test(html)){console.error("Legacy Supabase references remain in the Android app entry.");process.exitCode=1;}
if(html.includes("DEMO PURCHASES")||html.includes("buyDemoCoins(50)")){console.error("Old demo coin-shop buttons still present.");process.exitCode=1;}
if(!html.includes("const defaultCatalog=normalizeCatalog(defaultDramas),storedCatalog=normalizeCatalog(getStore(\"nexoraCatalog\"))")){console.error("Catalog migration missing: stored catalog must not replace canonical defaults.");process.exitCode=1;}
if(html.includes("NEXORA ORIGINAL")){console.error("Placeholder catalog must not be labeled as original production content.");process.exitCode=1;}
if(!html.includes("CATALOG PREVIEW")){console.error("Placeholder catalog preview label missing.");process.exitCode=1;}
if(!html.includes("const dramaIndex=selectedDrama,episodeIndex=n,request=++nxPlaybackRequest")||!html.includes("const request=++nxPlaybackRequest")||!html.includes("nxEpisodeUnlocks[dramaKey(d)+\":\"+n]=\"firebase-verified\"")){console.error("Episode verification race guards or verified-entitlement persistence missing.");process.exitCode=1;}
if(!html.includes("seq=nxListSyncSeq,keys=saved.map")||!html.includes("seq!==nxListSyncSeq)return null")){console.error("Stale queued My List upload guard missing.");process.exitCode=1;}
if(!html.includes('v.removeAttribute("src");v.load();v.classList.remove("nx-switching")')||!html.includes('This episode has no video source configured yet.')){console.error("Missing-source player must stop cleanly without retrying.");process.exitCode=1;}
if(!html.includes("for(let n=0;n<d.episodes;n++){const b=document.createElement(\"button\")")){console.error("Episode picker must render all episodes, not truncate at 12.");process.exitCode=1;}
const declared=new Set([...html.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
const handlers=[...html.matchAll(/onclick\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
const called=new Set();
for(const handler of handlers)for(const m of handler.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)){if(!["if","toast"].includes(m[1]))called.add(m[1]);}
const missing=[...called].filter(name=>!declared.has(name));
if(missing.length){console.error("Inline button handlers without matching function declaration:",missing.join(", "));process.exitCode=1;}
const ids=[...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
if(duplicates.length){console.error("Duplicate HTML id values:",[...new Set(duplicates)].join(", "));process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log("Web validation passed: "+scripts.length+" inline scripts syntax-checked; "+handlers.length+" click handlers checked; duplicate IDs checked; Firebase auth/My List/wallet and server-verified episode unlock wiring checked; legacy Supabase references blocked.");
