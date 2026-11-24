#!/usr/bin/env node
// Verify the source files needed by the Android bundle and native asset pipeline.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = [
  'APP_VERSION',
  'index.html',
  'firebase-config.js',
  'firebase/payment-ui.js',
  'google-services.json',
  'manifest.webmanifest',
  'icon.svg',
  'app-icon.png',
  'capacitor.config.json',
  'assets/icon.svg',
  'scripts/prepare-web.cjs',
  'scripts/generate-assets.cjs'
];
let failed = false;
const appVersionPath = path.join(root, 'APP_VERSION');
try {
  const appVersion = fs.readFileSync(appVersionPath, 'utf8').trim();
  const match = /^(\\d+)\\.(\\d+)$/.exec(appVersion);
  if (!match || Number(match[2]) >= 1000) {
    console.error('FAIL APP_VERSION must be major.minor with minor under 1000');
    failed = true;
  } else {
    console.log('PASS APP_VERSION: ' + appVersion);
  }
} catch (error) {
  console.error('FAIL APP_VERSION: ' + error.message);
  failed = true;
}
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
console.log('Android source asset validation passed.');
