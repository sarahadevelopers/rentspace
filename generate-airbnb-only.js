// generate-airbnb-only.js
const fs = require('fs');
const path = require('path');

console.log('Generating Airbnb individual pages...\n');

// Read properties
const properties = JSON.parse(fs.readFileSync('./data/properties.json', 'utf8'));

// Filter Airbnb properties
const airbnbProperties = properties.filter(p => p.rental_type === 'short_term');
console.log('Found ' + airbnbProperties.length + ' Airbnb properties');

// Create airbnb directory
const airbnbDir = './airbnb';
if (!fs.existsSync(airbnbDir)) {
    fs.mkdirSync(airbnbDir);
}

// Read Airbnb template
const templatePath = './templates/airbnb-property-template.html';
let template = fs.readFileSync(templatePath, 'utf8');

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/**
 * Process Handlebars-style #if blocks
 */
function processIfBlock(content, conditionName, conditionValue) {
    const regex = new RegExp(`\\{\\{#if ${conditionName}\\}\\}([\\s\\S]*?)\\{\\{\\/if\\}\\}`, 'g');
    return content.replace(regex, (match, inner) => {
        let cleanedInner = inner.replace(/\{\{else\}\}[\s\S]*?(\{\{\/if\}\})?/g, '');
        return conditionValue ? cleanedInner : '';
    });
}

/**
 * Process #each blocks by replacing with generated HTML
 */
function processEachBlock(content, eachName, replacementHtml) {
    const regex = new RegExp(`\\{\\{#each ${eachName}\\}\\}[\\s\\S]*?\\{\\{\\/each\\}\\}`, 'g');
    return content.replace(regex, replacementHtml);
}

// Generate each Airbnb page
airbnbProperties.forEach(prop => {
    let page = template;
    
    // Calculate rates
    const nightlyRate = prop.price_night || Math.round(prop.price / 30);
    const weeklyRate = prop.price_week || nightlyRate * 6; // use price_week if available
    const weeklySave = weeklyRate ? Math.round(((nightlyRate * 7) - weeklyRate) / (nightlyRate * 7) * 100) : 0;
    const hasWeeklyDiscount = !!prop.price_week;
    
    // --- Handle bedroom display (studio fix) ---
    let bedroomDisplay = prop.specs?.bedrooms;
    let bedroomLabel = '';
    let maxGuests = 0;
    if (bedroomDisplay === 0) {
        bedroomLabel = 'Studio';
        bedroomDisplay = 0;      // keep 0 for numeric fields, but we'll replace with text later
        maxGuests = 2;           // studio typically fits 2 guests
    } else {
        bedroomLabel = bedroomDisplay + (bedroomDisplay === 1 ? ' Bedroom' : ' Bedrooms');
        maxGuests = (bedroomDisplay || 1) * 2;
    }
    // Override max guests from property if provided
    if (prop.max_guests) maxGuests = prop.max_guests;
    
    // --- Check‑in/out (flexible 24‑hour stay) ---
    const checkInTime = 'Flexible (24‑hour stay)';
    const checkOutTime = '24 hours after check‑in';
    
    // Basic replacements
    page = page.replace(/\{\{title\}\}/g, escapeHtml(prop.title));
    page = page.replace(/\{\{description\}\}/g, escapeHtml(prop.description || 'Beautiful ' + (prop.type || 'property') + ' in ' + prop.estate));
    page = page.replace(/\{\{slug\}\}/g, prop.slug);
    page = page.replace(/\{\{estate\}\}/g, prop.estate);
    page = page.replace(/\{\{price_night\}\}/g, nightlyRate.toLocaleString());
    page = page.replace(/\{\{price_weekly_discount\}\}/g, weeklyRate.toLocaleString());
    page = page.replace(/\{\{weekly_save_percent\}\}/g, weeklySave);
    
    // Bedroom related: replace the numeric value and also the label in guest highlight
    page = page.replace(/\{\{bedrooms\}\}/g, bedroomDisplay === 0 ? 'Studio' : bedroomDisplay);
    page = page.replace(/\{\{bathrooms\}\}/g, prop.specs?.bathrooms || 1);
    page = page.replace(/\{\{max_guests\}\}/g, maxGuests);
    page = page.replace(/\{\{sqft\}\}/g, prop.specs?.sqft || 350);
    
    page = page.replace(/\{\{airbnb_rating\}\}/g, prop.airbnb_rating || '4.6');
    page = page.replace(/\{\{airbnb_reviews\}\}/g, prop.airbnb_reviews || 82);
    page = page.replace(/\{\{host_name\}\}/g, prop.host_name || 'RentSpace Premier Host');
    page = page.replace(/\{\{host_response_rate\}\}/g, prop.host_response_rate || 98);
    page = page.replace(/\{\{host_response_time\}\}/g, prop.host_response_time || 'within an hour');
    
    // Replace check‑in/out with flexible values
    page = page.replace(/\{\{check_in_time\}\}/g, checkInTime);
    page = page.replace(/\{\{check_out_time\}\}/g, checkOutTime);
    
    page = page.replace(/\{\{cancellation_policy\}\}/g, prop.cancellation_policy || 'Free cancellation for 48 hours');
    
    // ========== GALLERY ==========
    const images = prop.images && prop.images.length ? prop.images : ['/images/placeholder-airbnb.jpg'];
    const mainImageHtml = `<img src="${images[0]}" alt="${escapeHtml(prop.title)}">`;
    const thumbnailsHtml = images.map(img => `<div class="thumb"><img src="${img}" alt="Thumbnail"></div>`).join('');
    
    page = page.replace(/\{\{mainImage\}\}/g, mainImageHtml);
    page = page.replace(/\{\{thumbnails\}\}/g, thumbnailsHtml);
    page = processEachBlock(page, 'images', thumbnailsHtml);
    
    // ========== FEATURES ==========
    let featuresHtml = '';
    if (prop.features && prop.features.length) {
        featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
        featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>Intercom</li><li>Common Area Backup</li>';
    }
    page = processEachBlock(page, 'features', featuresHtml);
    
    // ========== AMENITIES ==========
    let amenitiesHtml = '';
    const amenitiesList = prop.short_stay_amenities || [
        'High-speed WiFi', 'Smart TV', 'Air conditioning', 'Fully equipped kitchen', 'Free parking', '24/7 security'
    ];
    // Map simple strings to icon+name objects
    const iconMap = {
        'High-speed WiFi': 'fa-wifi', 'Smart TV': 'fa-tv', 'Air conditioning': 'fa-snowflake',
        'Fully equipped kitchen': 'fa-utensils', 'Free parking': 'fa-parking', '24/7 security': 'fa-shield-alt',
        'Washer/Dryer': 'fa-jug-detergent', 'Fresh linens': 'fa-bed', 'Toiletries': 'fa-pump-soap',
        '24/7 check-in': 'fa-clock', 'Self check-in': 'fa-key', 'Workspace': 'fa-laptop'
    };
    amenitiesList.forEach(amenity => {
        const icon = iconMap[amenity] || 'fa-check-circle';
        amenitiesHtml += `<div class="amenity-item"><i class="fas ${icon}"></i><span>${escapeHtml(amenity)}</span></div>`;
    });
    page = processEachBlock(page, 'amenities', amenitiesHtml);
    
    // ========== SUPERHOST BADGE ==========
    const isSuperhost = prop.airbnb_superhost === true || prop.superhost === true;
    page = processIfBlock(page, 'superhost', isSuperhost);
    
    // ========== WEEKLY DISCOUNT BLOCK ==========
    page = processIfBlock(page, 'price_weekly_discount', hasWeeklyDiscount);
    
    // ========== SIMILAR STAYS ==========
    const similarProps = airbnbProperties.filter(p => p.id !== prop.id).slice(0, 3);
    let recsHtml = '';
    if (similarProps.length > 0) {
        recsHtml = `<div class="recommendation-cards">` + similarProps.map(rec => {
            const recNightly = rec.price_night || Math.round(rec.price / 30);
            return `
            <a href="../airbnb/${rec.slug}.html" class="rec-card">
                <div class="rec-card-image">
                    <img src="${rec.images?.[0] || '/images/placeholder.jpg'}" alt="${escapeHtml(rec.title)}">
                </div>
                <div class="rec-card-info">
                    <h4>${escapeHtml(rec.title)}</h4>
                    <p>${rec.estate} · KES ${recNightly.toLocaleString()} / night</p>
                    ${rec.airbnb_rating ? '<div class="rec-rating"><i class="fas fa-star"></i> ' + rec.airbnb_rating + '</div>' : ''}
                </div>
            </a>`;
        }).join('') + `</div>`;
    }
    page = processEachBlock(page, 'recommendations', recsHtml);
    page = processIfBlock(page, 'recommendations.length', recsHtml !== '');
    
    // ========== REVIEWS ==========
    // You can replace with real reviews later; for now keep sample
    const reviewsSample = `
    <div class="reviews-list">
        <div class="review-card">
            <div class="review-header"><strong>Sarah M.</strong><div class="review-rating"><i class="fas fa-star"></i> 5</div></div>
            <p>"Amazing stay! The apartment was spotless and exactly as described."</p>
            <span class="review-date">2 weeks ago</span>
        </div>
        <div class="review-card">
            <div class="review-header"><strong>James K.</strong><div class="review-rating"><i class="fas fa-star"></i> 4.8</div></div>
            <p>"Great location and value for money. Highly recommended for short stays."</p>
            <span class="review-date">1 month ago</span>
        </div>
    </div>`;
    page = processEachBlock(page, 'reviews', reviewsSample);
    page = processIfBlock(page, 'reviews.length', true);
    
    // ========== REMOVE LEFTOVER TEMPLATE SYNTAX ==========
    page = page.replace(/\{\{#if[\s\S]+?\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    page = page.replace(/\{\{else\}\}/g, '');
    page = page.replace(/\{\{#each[\s\S]+?\}\}[\s\S]*?\{\{\/each\}\}/g, '');
    
    // Write the file
    const outputPath = path.join(airbnbDir, `${prop.slug}.html`);
    fs.writeFileSync(outputPath, page);
    console.log(`Generated: /airbnb/${prop.slug}.html - ${prop.title} (KES ${nightlyRate}/night)`);
});

console.log(`\nDone! Generated ${airbnbProperties.length} Airbnb pages in /airbnb/ folder`);