#!/usr/bin/env node
// Syntax-check inline JavaScript in the app's HTML without executing it.
const fs = require('node:fs');
const vm = require('node:vm');
const htmlPath = process.argv[2] || 'index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) {
  console.error('No inline scripts found.');
  process.exit(1);
}
let failures = 0;
scripts.forEach((match, index) => {
  const body = match[1];
  if (!body.trim()) return;
  try {
    new vm.Script(body, { filename: htmlPath + ':script-' + (index + 1) });
    console.log('PASS inline script ' + (index + 1) + ' syntax');
  } catch (error) {
    failures++;
    console.error('FAIL inline script ' + (index + 1) + ': ' + error.message);
  }
});
if (failures) process.exit(1);
console.log('Checked ' + scripts.length + ' script tags; no syntax errors.');
