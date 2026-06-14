const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'data', 'properties.json');
const properties = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

properties.forEach(prop => {
    // Remove trailing " – KES .../mo" or " – KES ..." (with or without /mo)
    prop.title = prop.title.replace(/ – KES [\d,]+(\/mo)?$/, '').trim();
});

fs.writeFileSync(dataPath, JSON.stringify(properties, null, 2));
console.log('✅ Titles cleaned – price suffixes removed.');