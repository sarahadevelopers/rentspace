// generate-all.js - Complete unified generator (final SEO tweaks)
const fs = require('fs');
const path = require('path');

// Configuration
const DATA_PATH = path.join(__dirname, 'data', 'properties.json');
const RENTAL_TEMPLATE_PATH = path.join(__dirname, 'templates', 'property-template.html');
const AIRBNB_TEMPLATE_PATH = path.join(__dirname, 'templates', 'airbnb-property-template.html');
const RENTAL_OUTPUT_DIR = path.join(__dirname, 'property');
const AIRBNB_OUTPUT_DIR = path.join(__dirname, 'airbnb');

// Ensure output directories exist
[RENTAL_OUTPUT_DIR, AIRBNB_OUTPUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Read data
const properties = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const rentalTemplate = fs.readFileSync(RENTAL_TEMPLATE_PATH, 'utf8');
const airbnbTemplate = fs.readFileSync(AIRBNB_TEMPLATE_PATH, 'utf8');

// Separate properties
const rentals = properties.filter(p => p.rental_type === 'long_term' || (!p.price_night && p.available_for !== 'short_term'));
const airbnbs = properties.filter(p => p.rental_type === 'short_term' || p.price_night);

console.log('=' .repeat(50));
console.log('🚀 GENERATING ALL PROPERTY PAGES');
console.log('=' .repeat(50));
console.log(`📊 Total properties: ${properties.length}`);
console.log(`   🏠 Long-term rentals: ${rentals.length}`);
console.log(`   ✨ Airbnb/Short-stay: ${airbnbs.length}`);
console.log('=' .repeat(50));

// Helper function
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Helper to generate descriptive alt text for thumbnails (unique per property)
function getAltTextForThumbnail(idx, prop, isRental = true) {
    // Use the full property title (unique) for the base description
    const uniqueTitle = isRental ? prop.title : (prop.title.split(' – ')[0] || prop.title);
    
    // Descriptor based on image index (flexible for various room types)
    const altMap = [
        'Living area',
        'Master bedroom',
        'Kitchen',
        'Bathroom',
        'Exterior view',
        'Additional view',
        'Dining area',
        'Bedroom',
        'Compound view'
    ];
    const descriptor = altMap[idx] || `View ${idx + 1}`;
    
    // Combine: "Living area of 2 Bedroom Apartment to Let in Kitengela"
    return `${descriptor} of ${uniqueTitle}`;
}

// ========== GENERATE RENTAL PAGES (to /property/) ==========
console.log('\n📝 Generating Rental Pages...');
rentals.forEach(prop => {
    let page = rentalTemplate;
    
    // Additional computed fields for SEO
    const numericPrice = prop.price?.toString().replace(/,/g, '') || '0';
    const estateSlug = prop.estate.toLowerCase();

    // Determine schema type: "House" for bungalows/maisonettes/mansions, otherwise "Apartment"
let schemaType = 'Apartment';
const propertyType = (prop.type || '').toLowerCase();
if (propertyType.includes('bungalow') || propertyType.includes('maisonette') || propertyType.includes('mansion')) {
    schemaType = 'House';
}
// Also check title for safety
const titleLower = (prop.title || '').toLowerCase();
if (titleLower.includes('bungalow') || titleLower.includes('maisonette') || titleLower.includes('mansion')) {
    schemaType = 'House';
}
    
    // Basic replacements
    page = page.replace(/\{\{title\}\}/g, escapeHtml(prop.title));
    page = page.replace(/\{\{description\}\}/g, escapeHtml(prop.description || `Beautiful ${prop.type} in ${prop.estate}`));
    page = page.replace(/\{\{slug\}\}/g, prop.slug);
    page = page.replace(/\{\{estate\}\}/g, prop.estate);
    page = page.replace(/\{\{price\}\}/g, prop.price?.toLocaleString() || '0');
    page = page.replace(/\{\{bedrooms\}\}/g, prop.specs?.bedrooms || 1);
    page = page.replace(/\{\{bathrooms\}\}/g, prop.specs?.bathrooms || 1);
    page = page.replace(/\{\{parking\}\}/g, prop.specs?.parking || 1);
    page = page.replace(/\{\{sqft\}\}/g, prop.specs?.sqft || 800);
    page = page.replace(/\{\{encodedTitle\}\}/g, encodeURIComponent(prop.title));
    page = page.replace(/\{\{fumigationLink\}\}/g, prop.fumigationLink || 'https://fumigo.co.ke');
    
    // SEO fields
    const seoTitle = prop.seo_title || `${prop.title} – KES ${prop.price?.toLocaleString()}/mo | RentSpace`;
    const metaDesc = prop.meta_description || (prop.description || '').substring(0, 150);
    page = page.replace(/\{\{seo_title\}\}/g, escapeHtml(seoTitle));
    page = page.replace(/\{\{meta_description\}\}/g, escapeHtml(metaDesc));
    
    // Why rent section
    const whyRent = prop.why_rent || '';
    const whyRentDisplay = whyRent ? 'block' : 'none';
    page = page.replace(/\{\{why_rent\}\}/g, escapeHtml(whyRent));
    page = page.replace(/\{\{why_rent_display\}\}/g, whyRentDisplay);
    
    // Features list
    let featuresHtml = '';
    if (prop.features && prop.features.length) {
        featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
        featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>24/7 Security</li>';
    }
    page = page.replace(/\{\{featuresList\}\}/g, featuresHtml);
    
    // ========== Generate Gallery HTML for Rental Pages ==========
    let mainImageHtml = '';
    let thumbnailsHtml = '';
    let mainImageUrl = '';
    
    if (prop.images && prop.images.length) {
        mainImageUrl = prop.images[0];
        mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
        
        // Generate thumbnails with unique alt text per image
        thumbnailsHtml = prop.images.map((img, idx) => {
            const altText = getAltTextForThumbnail(idx, prop, true);
            return `<div class="thumb" data-index="${idx}"><img src="${img}" alt="${altText}" loading="lazy"></div>`;
        }).join('');
    } else {
        mainImageUrl = '/images/placeholder.jpg';
        mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
        thumbnailsHtml = `<div class="thumb" data-index="0"><img src="${mainImageUrl}" alt="No image available" loading="lazy"></div>`;
    }
    
    page = page.replace(/\{\{mainImage\}\}/, mainImageHtml);
    page = page.replace(/\{\{thumbnails\}\}/, thumbnailsHtml);
    page = page.replace(/\{\{mainImageUrl\}\}/g, mainImageUrl);
    
    // NEW: numeric price and lowercase estate slug for schema
    page = page.replace(/\{\{numericPrice\}\}/g, numericPrice);
page = page.replace(/\{\{estateSlug\}\}/g, estateSlug);
page = page.replace(/\{\{schemaType\}\}/g, schemaType);
    
    // Recommendations
    const similarRentals = rentals.filter(r => r.id !== prop.id && r.estate === prop.estate).slice(0, 4);
    let recsHtml = '';
    similarRentals.forEach(rec => {
        recsHtml += `
        <a href="../property/${rec.slug}.html" class="rec-card">
            <div class="rec-card-image">
                <img src="${rec.images?.[0] || '/images/placeholder.jpg'}" alt="${escapeHtml(rec.title)}">
            </div>
            <div class="rec-card-info">
                <h4>${escapeHtml(rec.title)}</h4>
                <p>${rec.estate} · KES ${rec.price?.toLocaleString()} / mo</p>
            </div>
        </a>`;
    });
    page = page.replace(/\{\{recommendations\}\}/g, recsHtml);
    
    // Reviews
    const reviews = prop.reviews || [];
    let reviewsHtml = '';
    if (reviews.length > 0) {
        reviewsHtml = reviews.map(r => `
        <div class="testimonial-card">
            <div class="testimonial-content">
                <i class="fas fa-quote-left"></i>
                <p>"${escapeHtml(r.comment)}"</p>
            </div>
            <div class="testimonial-author">
                <strong>${escapeHtml(r.name)}</strong>
                <span>Verified Client</span>
            </div>
        </div>`).join('');
    } else {
        reviewsHtml = `
        <div class="testimonial-card">
            <div class="testimonial-content">
                <i class="fas fa-quote-left"></i>
                <p>"Great property, exactly as described. The team was responsive and professional."</p>
            </div>
            <div class="testimonial-author">
                <strong>Verified Client</strong>
                <span>RentSpace Tenant</span>
            </div>
        </div>`;
    }
    page = page.replace(/\{\{reviews\}\}/g, reviewsHtml);
    
    const outputPath = path.join(RENTAL_OUTPUT_DIR, `${prop.slug}.html`);
    fs.writeFileSync(outputPath, page);
    console.log(`   ✅ Rental: ${prop.slug}.html`);
});

// ========== GENERATE AIRBNB PAGES (to /airbnb/) ==========
console.log('\n📝 Generating Airbnb Pages...');
airbnbs.forEach(prop => {
    let page = airbnbTemplate;
    
    // Calculate nightly rate
    const nightlyRate = prop.price_night || Math.round(prop.price / 30);
    const weeklyRate = nightlyRate * 6;
    const weeklySave = Math.round(((nightlyRate * 7) - weeklyRate) / (nightlyRate * 7) * 100);
    
    // Basic replacements
    page = page.replace(/\{\{title\}\}/g, escapeHtml(prop.title));
    page = page.replace(/\{\{description\}\}/g, escapeHtml(prop.description || `Beautiful ${prop.type} in ${prop.estate}`));
    page = page.replace(/\{\{slug\}\}/g, prop.slug);
    page = page.replace(/\{\{estate\}\}/g, prop.estate);
    page = page.replace(/\{\{price_night\}\}/g, nightlyRate.toLocaleString());
    page = page.replace(/\{\{price_weekly_discount\}\}/g, weeklyRate.toLocaleString());
    page = page.replace(/\{\{weekly_save_percent\}\}/g, weeklySave);
    page = page.replace(/\{\{bedrooms\}\}/g, prop.specs?.bedrooms || 1);
    page = page.replace(/\{\{bathrooms\}\}/g, prop.specs?.bathrooms || 1);
    page = page.replace(/\{\{max_guests\}\}/g, (prop.specs?.bedrooms * 2) || 4);
    page = page.replace(/\{\{sqft\}\}/g, prop.specs?.sqft || 800);
    page = page.replace(/\{\{airbnb_rating\}\}/g, prop.airbnb_rating || '4.9');
    page = page.replace(/\{\{airbnb_reviews\}\}/g, prop.airbnb_reviews || 25);
    page = page.replace(/\{\{host_name\}\}/g, prop.host_name || 'RentSpace Premier Host');
    page = page.replace(/\{\{host_response_rate\}\}/g, prop.host_response_rate || 98);
    page = page.replace(/\{\{host_response_time\}\}/g, prop.host_response_time || 'within an hour');
    page = page.replace(/\{\{check_in_time\}\}/g, prop.check_in_time || '2:00 PM');
    page = page.replace(/\{\{check_out_time\}\}/g, prop.check_out_time || '10:00 AM');
    page = page.replace(/\{\{cancellation_policy\}\}/g, prop.cancellation_policy || 'Free cancellation for 48 hours');
    
    // SEO fields for Airbnb
    const seoTitle = prop.seo_title || `${prop.title} – KES ${nightlyRate}/night | RentSpace`;
    const metaDesc = prop.meta_description || (prop.description || '').substring(0, 150);
    page = page.replace(/\{\{seo_title\}\}/g, escapeHtml(seoTitle));
    page = page.replace(/\{\{meta_description\}\}/g, escapeHtml(metaDesc));
    
    // Why rent section (optional for Airbnb)
    const whyRent = prop.why_rent || '';
    const whyRentDisplay = whyRent ? 'block' : 'none';
    page = page.replace(/\{\{why_rent\}\}/g, escapeHtml(whyRent));
    page = page.replace(/\{\{why_rent_display\}\}/g, whyRentDisplay);
    
    // Weekly discount display
    const weeklyDisplay = prop.price_week ? 'block' : 'none';
    page = page.replace(/\{\{weekly_display\}\}/g, weeklyDisplay);
    
    // Superhost badge display
    const superhostDisplay = prop.airbnb_superhost ? 'block' : 'none';
    page = page.replace(/\{\{superhost_display\}\}/g, superhostDisplay);
    
    // Features list (as HTML list items)
    let featuresHtml = '';
    if (prop.features && prop.features.length) {
        featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
        featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>24/7 Security</li><li>High-speed WiFi</li>';
    }
    page = page.replace(/\{\{features_html\}\}/g, featuresHtml);
    
    // Amenities grid (full HTML)
    let amenitiesHtml = '';
    if (prop.short_stay_amenities && prop.short_stay_amenities.length) {
        amenitiesHtml = prop.short_stay_amenities.map(a => `
            <div class="amenity-item">
                <i class="fas fa-check-circle"></i>
                <span>${escapeHtml(a)}</span>
            </div>
        `).join('');
    } else {
        // Fallback amenities
        amenitiesHtml = `
            <div class="amenity-item"><i class="fas fa-wifi"></i><span>High-speed WiFi</span></div>
            <div class="amenity-item"><i class="fas fa-tv"></i><span>Smart TV</span></div>
            <div class="amenity-item"><i class="fas fa-utensils"></i><span>Kitchenette</span></div>
            <div class="amenity-item"><i class="fas fa-parking"></i><span>Free parking</span></div>
        `;
    }
    page = page.replace(/\{\{amenities_html\}\}/g, amenitiesHtml);
    
    // ========== Generate Gallery HTML for Airbnb Pages ==========
    let mainImageHtml = '';
    let thumbnailsHtml = '';
    let mainImageUrl = '';
    
    if (prop.images && prop.images.length) {
        mainImageUrl = prop.images[0];
        mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
        
        // Use the same helper for Airbnb thumbnails (pass isRental=false)
        thumbnailsHtml = prop.images.map((img, idx) => {
            const altText = getAltTextForThumbnail(idx, prop, false);
            return `<div class="thumb" data-index="${idx}"><img src="${img}" alt="${altText}" loading="lazy"></div>`;
        }).join('');
    } else {
        mainImageUrl = '/images/placeholder.jpg';
        mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
        thumbnailsHtml = `<div class="thumb" data-index="0"><img src="${mainImageUrl}" alt="No image available" loading="lazy"></div>`;
    }
    
    page = page.replace(/\{\{mainImage\}\}/, mainImageHtml);
    page = page.replace(/\{\{thumbnails\}\}/, thumbnailsHtml);
    page = page.replace(/\{\{mainImageUrl\}\}/g, mainImageUrl);
    
    // Similar stays (recommendations)
    const similarAirbnbs = airbnbs.filter(a => a.id !== prop.id && a.estate === prop.estate).slice(0, 3);
    let similarStaysHtml = '';
    similarAirbnbs.forEach(rec => {
        const recNightly = rec.price_night || Math.round(rec.price / 30);
        similarStaysHtml += `
            <a href="../airbnb/${rec.slug}.html" class="rec-card">
                <div class="rec-card-image">
                    <img src="${rec.images?.[0] || '/images/placeholder.jpg'}" alt="${escapeHtml(rec.title)}">
                </div>
                <div class="rec-card-info">
                    <h4>${escapeHtml(rec.title)}</h4>
                    <p>${rec.estate} · KES ${recNightly.toLocaleString()} / night</p>
                    ${rec.airbnb_rating ? `<div class="rec-rating"><i class="fas fa-star"></i> ${rec.airbnb_rating}</div>` : ''}
                </div>
            </a>
        `;
    });
    const similarStaysDisplay = similarAirbnbs.length ? 'block' : 'none';
    page = page.replace(/\{\{similar_stays_html\}\}/g, similarStaysHtml);
    page = page.replace(/\{\{similar_stays_display\}\}/g, similarStaysDisplay);
    
    // Guest reviews
    let reviewsHtml = '';
    if (prop.reviews && prop.reviews.length) {
        reviewsHtml = prop.reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <strong>${escapeHtml(r.name)}</strong>
                    <div class="review-rating"><i class="fas fa-star"></i> ${r.rating}</div>
                </div>
                <p>"${escapeHtml(r.comment)}"</p>
                <span class="review-date">${escapeHtml(r.date)}</span>
            </div>
        `).join('');
    } else {
        // Fallback reviews
        reviewsHtml = `
            <div class="review-card">
                <div class="review-header">
                    <strong>Sarah M.</strong>
                    <div class="review-rating"><i class="fas fa-star"></i> 5</div>
                </div>
                <p>"Great location and value. Would stay again!"</p>
                <span class="review-date">2 weeks ago</span>
            </div>
            <div class="review-card">
                <div class="review-header">
                    <strong>James K.</strong>
                    <div class="review-rating"><i class="fas fa-star"></i> 4.8</div>
                </div>
                <p>"Amazing stay! The apartment was spotless and exactly as described."</p>
                <span class="review-date">1 month ago</span>
            </div>
        `;
    }
    const reviewsDisplay = 'block'; // Always show reviews section (even if fallback)
    page = page.replace(/\{\{reviews_html\}\}/g, reviewsHtml);
    page = page.replace(/\{\{reviews_display\}\}/g, reviewsDisplay);
    
    const outputPath = path.join(AIRBNB_OUTPUT_DIR, `${prop.slug}.html`);
    fs.writeFileSync(outputPath, page);
    console.log(`   ✅ Airbnb: ${prop.slug}.html (KES ${nightlyRate}/night)`);
});

console.log('\n' + '='.repeat(50));
console.log('🎉 GENERATION COMPLETE!');
console.log('=' .repeat(50));
console.log(`   📁 Rentals: ${RENTAL_OUTPUT_DIR} (${rentals.length} files)`);
console.log(`   📁 Airbnb: ${AIRBNB_OUTPUT_DIR} (${airbnbs.length} files)`);
console.log('\n💡 Next steps:');
console.log('   1. Run: node server.js');
console.log('   2. Visit: http://localhost:3000/airbnb.html');
console.log('   3. Edit data/properties.json and re-run this script');