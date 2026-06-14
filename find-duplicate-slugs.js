const fs = require('fs');
const properties = JSON.parse(fs.readFileSync('data/properties.json', 'utf8'));
const slugs = properties.map(p => p.slug);
const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
if (duplicates.length) {
    console.log('Duplicate slugs found:', [...new Set(duplicates)]);
} else {
    console.log('✅ No duplicate slugs.');
}