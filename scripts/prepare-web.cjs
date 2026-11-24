const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');

const requiredFiles = [
  'index.html',
  'firebase-config.js',
  'supabase-config.js',
  'manifest.webmanifest',
  'icon.svg',
  'app-icon.png',
  'firebase/payment-ui.js'
];

fs.mkdirSync(www, { recursive: true });

for (const relative of requiredFiles) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error('Required Android bundle file is missing: ' + relative);
  }

  const destination = path.join(www, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log('Prepared Android asset: ' + relative);
}

console.log('Prepared NEXORA Capacitor assets in www/.');
