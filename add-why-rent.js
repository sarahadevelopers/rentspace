const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data', 'properties.json');

// Load properties
let properties = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Helper: clean text (remove extra spaces, line breaks)
function cleanText(str) {
    return str.replace(/\s+/g, ' ').trim();
}

// Helper: extract unique selling points from description
function extractUSPs(description, title, estate, price, features) {
    let usps = [];
    const lowerDesc = description.toLowerCase();

    // Common keywords to look for
    const keywords = {
        'private compound': /private\s+(?:compound|plot|garden|yard)/i,
        'master ensuite': /master\s+ensuite|master\s+bathroom/i,
        'electric fence': /electric\s+fence|perimeter\s+wall/i,
        'solar water heater': /solar\s+water\s+heater|solar\s+panels/i,
        'borehole water': /borehole|own\s+water\s+supply/i,
        'parking': /ample\s+parking|parking\s+for\s+(\d+)/i,
        'security': /24\/7\s+security|gated\s+community|security\s+guard/i,
        'modern finishes': /modern\s+finishes|premium\s+finishes|high\-end/i,
        'spacious': /spacious|expansive|large/i,
        'landscaped garden': /landscaped\s+garden|gardens|compound\s+with\s+grass/i,
        'close to amenities': /close\s+to\s+(?:school|mall|shopping|hospital)|near\s+(?:school|mall|shopping|hospital)/i,
        'furnished': /furnished|semi\-furnished/i,
        'internet ready': /internet\s+ready|fibre\s+ready/i
    };

    for (const [key, regex] of Object.entries(keywords)) {
        if (regex.test(description)) {
            usps.push(key);
        }
    }

    // Add fallback from features array if available
    if (features && features.length) {
        const featureKeywords = ['security', 'parking', 'water', 'solar', 'electric', 'fence', 'tiled', 'intercom'];
        features.forEach(f => {
            const lowerF = f.toLowerCase();
            for (const kw of featureKeywords) {
                if (lowerF.includes(kw) && !usps.some(u => lowerF.includes(u))) {
                    usps.push(kw);
                    break;
                }
            }
        });
    }

    // Remove duplicates and limit to 4 most relevant
    usps = [...new Set(usps)].slice(0, 4);

    // Build a sentence
    let whyRent = '';
    if (usps.length > 0) {
        whyRent = `This home stands out with ${usps.join(', ')}. `;
    }

    // Add a generic benefit if nothing specific found
    if (whyRent === '') {
        whyRent = `This well-maintained property in ${estate} offers comfort and convenience. `;
    }

    // Add target tenant suggestion based on price/bedrooms/buzzwords
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('family') || lowerTitle.includes('bungalow') || (parseInt(price) > 50000)) {
        whyRent += `Ideal for families seeking space and security.`;
    } else if (lowerTitle.includes('studio') || lowerTitle.includes('bedsitter')) {
        whyRent += `Perfect for singles or students.`;
    } else {
        whyRent += `Great for professionals or small families.`;
    }

    return whyRent;
}

// Process each property
let updatedCount = 0;
properties = properties.map(prop => {
    // Skip if already has a non-empty why_rent (preserve manual edits)
    if (prop.why_rent && prop.why_rent.trim() !== '') {
        console.log(`⏭️ Skipping ${prop.slug} – already has why_rent.`);
        return prop;
    }

    const description = cleanText(prop.description || '');
    if (!description) {
        console.log(`⚠️ No description for ${prop.slug}, skipping why_rent generation.`);
        return prop;
    }

    const whyRent = extractUSPs(
        description,
        prop.title,
        prop.estate,
        prop.price,
        prop.features
    );

    prop.why_rent = whyRent;
    updatedCount++;
    console.log(`✅ Generated why_rent for ${prop.slug}`);
    return prop;
});

// Write back the updated JSON
fs.writeFileSync(DATA_PATH, JSON.stringify(properties, null, 2));
console.log(`\n🎉 Done! Generated why_rent for ${updatedCount} properties.`);
console.log(`💡 You can now manually edit any why_rent fields in ${DATA_PATH} to customise further.`);