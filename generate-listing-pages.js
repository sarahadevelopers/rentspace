// generate-listing-pages.js
// Run with: node generate-listing-pages.js
// This generates rentals.html and airbnb.html with correct property links

const fs = require('fs');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, 'data', 'properties.json');
const RENTALS_OUTPUT = path.join(__dirname, 'rentals.html');
const AIRBNB_OUTPUT = path.join(__dirname, 'airbnb.html');

// ─── Read properties ────────────────────────────────────────────
const properties = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Separate into rentals and Airbnb
const rentals = properties.filter(p => p.rental_type !== 'short_term' && !p.price_night);
const airbnbs = properties.filter(p => p.rental_type === 'short_term' || p.price_night);

console.log(`📊 Total properties: ${properties.length}`);
console.log(`   🏠 Rentals: ${rentals.length}`);
console.log(`   ✨ Airbnb: ${airbnbs.length}`);

// ─── Helper: Generate property card HTML ───────────────────────
function generateCard(prop, isAirbnb = false) {
    const link = isAirbnb ? `airbnb/${prop.slug}.html` : `property/${prop.slug}.html`;
    const img = prop.images?.[0] || '/images/placeholder.jpg';
    const title = prop.title || 'Property';
    const estate = prop.estate || 'Unknown';

    let priceDisplay;
    if (isAirbnb) {
        const nightly = prop.price_night || Math.round(prop.price / 30);
        priceDisplay = `KES ${nightly.toLocaleString()}/night`;
    } else {
        priceDisplay = `KES ${(prop.price || 0).toLocaleString()}/mo`;
    }

    return `
    <div class="property-card">
        <a href="${link}">
            <div class="card-image">
                <img src="${img}" alt="${title}" loading="lazy" onerror="this.src='/images/placeholder.jpg'">
                ${isAirbnb ? '<span class="airbnb-tag"><i class="fab fa-airbnb"></i> Short-stay</span>' : ''}
            </div>
            <div class="card-info">
                <h3>${title}</h3>
                <p class="location">${estate}</p>
                <p class="price">${priceDisplay}</p>
            </div>
        </a>
    </div>`;
}

// ─── Build the HTML content ────────────────────────────────────

// Generate all cards
const rentalCards = rentals.map(p => generateCard(p, false)).join('');
const airbnbCards = airbnbs.map(p => generateCard(p, true)).join('');

// ─── Function to update a listing page ─────────────────────────
function updateListingPage(filePath, cardHtml) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${filePath} not found. Creating a new file from scratch...`);
        // Create a basic page if it doesn't exist
        const basicTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${path.basename(filePath, '.html').charAt(0).toUpperCase() + path.basename(filePath, '.html').slice(1)} | RentSpace</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Include your header/nav here -->
    <main class="container">
        <h1>${path.basename(filePath, '.html').charAt(0).toUpperCase() + path.basename(filePath, '.html').slice(1)}</h1>
        <div class="listings-grid">
            ${cardHtml}
        </div>
    </main>
    <!-- Include your footer here -->
</body>
</html>`;
        fs.writeFileSync(filePath, basicTemplate);
        console.log(`✅ Created new file: ${filePath}`);
        return;
    }

    // Read existing file
    let html = fs.readFileSync(filePath, 'utf8');

    // Find the listings-grid container and replace its content
    const containerRegex = /<div class="listings-grid">[\s\S]*?<\/div>/;
    const newContainer = `<div class="listings-grid">${cardHtml}</div>`;

    if (containerRegex.test(html)) {
        html = html.replace(containerRegex, newContainer);
        fs.writeFileSync(filePath, html);
        console.log(`✅ Updated ${filePath}`);
    } else {
        // If container not found, try to inject it
        console.log(`⚠️ Could not find <div class="listings-grid"> in ${filePath}.`);
        console.log(`   Please manually add <div class="listings-grid">...${cardHtml}...</div>`);
        console.log(`   Or you can replace the content with the generated HTML.`);
    }
}

// ─── Update both pages ──────────────────────────────────────────

console.log('\n📝 Updating listing pages...');

// Update rentals.html
updateListingPage(RENTALS_OUTPUT, rentalCards);

// Update airbnb.html
updateListingPage(AIRBNB_OUTPUT, airbnbCards);

console.log('\n🎉 Done! Rentals and Airbnb pages have been updated with correct property links.');
console.log(`   📁 Rentals: ${rentals.length} properties`);
console.log(`   📁 Airbnb: ${airbnbs.length} properties`);
console.log('\n💡 Next steps:');
console.log('   1. Review the changes: open rentals.html and airbnb.html');
console.log('   2. Push to GitHub: git add . && git commit -m "Update listing pages with correct slugs" && git push');