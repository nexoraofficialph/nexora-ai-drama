const fs=require('fs');
const html=fs.readFileSync('studio/index.html','utf8');
const checks=[
 ['bundled Supabase config loaded before Studio app scripts',html.includes('<script src="./supabase-config.js"></script>')],
 ['Android WebView has inline public-config fallback',html.includes('window.NEXORA_SUPABASE_CONFIG=window.NEXORA_SUPABASE_CONFIG||{url:"https://ystudugfquekasxfyeid.supabase.co",publishableKey:"sb_publishable_')],
 ['email/password sign-in reads the configured project and key',html.includes('async function signInStudio()')&&html.includes('cfg=getCloudConfig()')],
 ['session expiry validation',/function readAuthSession\(\)[\s\S]*?Date\.now\(\)>=s\.expires_at/.test(html)],
 ['expiry re-lock function',/function enforceStudioSession\(\)/.test(html)],
 ['foreground revalidation',/visibilitychange[\s\S]*?enforceStudioSession/.test(html)],
 ['periodic session revalidation',/setInterval\(enforceStudioSession,\s*30000\)/.test(html)],
 ['invalid session cleanup',/sessionStorage\.removeItem\(AUTH_SESSION_KEY\)/.test(html)],
 ['local-only warning present',/Studio data remains device-local/.test(html)],
 ['sign-out action',/function signOutStudio\(\)/.test(html)]
];
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);}
if(checks.some(x=>!x[1]))process.exit(1);
console.log('Studio auth-session static audit passed.');
