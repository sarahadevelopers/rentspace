// fix-ids.js
const fs = require('fs');
const path = require('path');

// Read the properties.json file
const filePath = path.join(__dirname, 'data', 'properties.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Assign unique IDs starting from 1
data.forEach((prop, index) => {
  prop.id = index + 1;
});

// Write back to file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log(`✅ Fixed ${data.length} properties with unique IDs!`);