#!/usr/bin/env node
// Verify the source files needed by the web bundle and Android asset pipeline.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = [
  'index.html',
  'supabase-config.js',
  'manifest.webmanifest',
  'icon.svg',
  'app-icon.png',
  'capacitor.config.json',
  'assets/icon.svg',
  'scripts/prepare-web.cjs',
  'scripts/generate-assets.cjs'
];
let failed = false;
for (const relative of required) {
  const full = path.join(root, relative);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) {
    console.log('PASS source asset: ' + relative);
  } else {
    console.error('FAIL missing source asset: ' + relative);
    failed = true;
  }
}
const manifestPath = path.join(root, 'manifest.webmanifest');
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.icons?.some(icon => icon.src === './app-icon.png')) {
    console.error('FAIL manifest must reference generated ./app-icon.png');
    failed = true;
  } else {
    console.log('PASS manifest icon points to generated app-icon.png');
  }
} catch (error) {
  console.error('FAIL manifest JSON: ' + error.message);
  failed = true;
}
if (failed) process.exit(1);
console.log('Source asset validation passed.');
