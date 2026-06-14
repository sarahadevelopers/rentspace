const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'properties.json');
const properties = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Helper: convert to sentence case (first letter of each word capitalised, rest lower)
function toSentenceCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

let changed = 0;
properties.forEach(prop => {
  const newTitle = toSentenceCase(prop.title);
  if (newTitle !== prop.title) {
    prop.title = newTitle;
    changed++;
  }
});

fs.writeFileSync(dataPath, JSON.stringify(properties, null, 2));
console.log(`✅ Converted ${changed} titles to sentence case.`);

properties.forEach(prop => {
  if (!prop.meta_description) {
    // Generate from existing description: take first 150 chars, clean newlines
    let rawDesc = (prop.description || '').replace(/\n/g, ' ').trim();
    let meta = rawDesc.substring(0, 150);
    if (meta.length === 150 && rawDesc.length > 150) meta += '…';
    prop.meta_description = meta;
  }
});
fs.writeFileSync(dataPath, JSON.stringify(properties, null, 2));
console.log(`✅ Added meta_description to properties.`);