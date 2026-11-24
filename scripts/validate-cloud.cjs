const fs=require('node:fs'),vm=require('node:vm');
const studio=fs.readFileSync('studio/index.html','utf8'),viewer=fs.readFileSync('index.html','utf8'),config=fs.readFileSync('supabase-config.js','utf8'),sql=fs.readFileSync('supabase/live_cloud_v1.sql','utf8'),prep=fs.readFileSync('scripts/prepare-web.cjs','utf8');
for(const [label,html] of [['Studio',studio],['Viewer',viewer]]){const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());if(!scripts.length)throw new Error(label+' has no inline scripts');scripts.forEach((source,index)=>{try{new vm.Script(source,{filename:label+' inline script '+(index+1)});}catch(err){console.error(label+' script syntax error:',err.stack);process.exit(1);}});console.log('PASS '+label+' inline script syntax');}
const checks=[
 ['Studio HTTPS source input',studio.includes('id="episodeVideoUrl"')],
 ['Studio cloud publishing function',studio.includes('function publishStudioCatalog()')],
 ['Admin membership validation',studio.includes('/rest/v1/studio_admins?select=user_id')],
 ['Private video upload handler',studio.includes('function uploadCloudVideo()')],
 ['Upload links to episode row',studio.includes('episode_id:cloudEpisode.id')],
 ['Upload size limit 50 MB',studio.includes('50*1024*1024')],
 ['Viewer config script inclusion',viewer.includes('supabase-config.js')],
 ['Viewer cloud catalog loader',viewer.includes('nxLoadPublishedSupabaseCatalog')],
 ['Viewer public catalog query only',viewer.includes('status=eq.published')],
 ['Private Storage bucket',sql.includes("values ('nexora-videos','nexora-videos',false")],
 ['Admin-only Storage upload policy',sql.includes('NEXORA admins upload videos')&&sql.includes('public.studio_admins')],
 ['Android copies Supabase config',prep.includes('supabase-config.js')],
 ['No service-role credential in client config',!/\bservice_role\s*:/i.test(config)&&!studio.includes('SUPABASE_SERVICE_ROLE_KEY')]
];
for(const [label,ok] of checks)console.log((ok?'PASS':'FAIL')+' '+label);
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log('Cloud publishing static checks passed. Live database policies, real credentials and playback delivery require separate verification.');
