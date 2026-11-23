const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
fs.mkdirSync(assets, { recursive: true });
(async () => {
  await sharp(path.join(assets, 'icon.svg')).resize(1024, 1024).png().toFile(path.join(assets, 'icon.png'));
  await sharp(path.join(assets, 'splash.svg')).resize(1080, 1920, { fit: 'contain', background: '#08080c' }).png().toFile(path.join(assets, 'splash.png'));
  await sharp(path.join(assets, 'icon.svg')).resize(512, 512).png().toFile(path.join(root, 'app-icon.png'));
  console.log('Generated NEXORA launcher and splash image assets.');
})().catch(err => { console.error(err); process.exit(1); });
