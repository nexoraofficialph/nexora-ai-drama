const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const www=path.join(root,'www');
fs.mkdirSync(www,{recursive:true});
for(const file of ['index.html','supabase-config.js','manifest.webmanifest','icon.svg','app-icon.png']){
 const source=path.join(root,file);
 if(fs.existsSync(source))fs.copyFileSync(source,path.join(www,file));
}
console.log('Prepared Capacitor web assets in www/');
