const fs=require('fs');
const html=fs.readFileSync('studio/index.html','utf8');
const checks=[
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
