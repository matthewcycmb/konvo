// Build the standalone design preview. Does not alter shipped onboarding views.
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('../node_modules/jsdom');
const source = new JSDOM(fs.readFileSync(path.join(__dirname, 'paywall-yearly-inbox-preview.html'), 'utf8'));
const art = {
  frame: source.window.document.querySelector('.original-frame').src,
  avatars: source.window.document.querySelector('.social-faces').src,
};
source.window.close();
const template = fs.readFileSync(path.join(__dirname, 'paywall-weekly-offer.template.html'), 'utf8');
const output = path.join(__dirname, 'paywall-weekly-offer.html');
fs.writeFileSync(output, template.replace('__ART_DATA__', JSON.stringify(art)));
console.log(`Built ${output} (${(fs.statSync(output).size / 1024 / 1024).toFixed(1)} MB)`);
