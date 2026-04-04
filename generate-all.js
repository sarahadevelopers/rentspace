// generate-all.js - Complete unified generator
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

// Generate Rental Pages (to /property/)
console.log('\n📝 Generating Rental Pages...');
rentals.forEach(prop => {
    let page = rentalTemplate;
    
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
    
    // Features
    let featuresHtml = '';
    if (prop.features && prop.features.length) {
        featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
        featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>24/7 Security</li>';
    }
    page = page.replace(/\{\{#each features\}\}[\s\S]*?\{\{\/each\}\}/, featuresHtml);
    
    // Images
    let imagesHtml = '';
    if (prop.images && prop.images.length) {
        imagesHtml = prop.images.map(img => `<img src="${img}" class="gallery-item" alt="${escapeHtml(prop.title)}" loading="lazy">`).join('');
    } else {
        imagesHtml = `<img src="/images/placeholder-rental.jpg" class="gallery-item" alt="${escapeHtml(prop.title)}" loading="lazy">`;
    }
    page = page.replace(/\{\{#each images\}\}[\s\S]*?\{\{\/each\}\}/, imagesHtml);
    
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
    page = page.replace(/\{\{#each recommendations\}\}[\s\S]*?\{\{\/each\}\}/, recsHtml);
    
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
    }
    page = page.replace(/\{\{#each reviews\}\}[\s\S]*?\{\{\/each\}\}/, reviewsHtml);
    
    const outputPath = path.join(RENTAL_OUTPUT_DIR, `${prop.slug}.html`);
    fs.writeFileSync(outputPath, page);
    console.log(`   ✅ Rental: ${prop.slug}.html`);
});

// Generate Airbnb Pages (to /airbnb/)
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
    
    // Images
    let imagesHtml = '';
    if (prop.images && prop.images.length) {
        imagesHtml = prop.images.map(img => `<img src="${img}" class="gallery-item" alt="${escapeHtml(prop.title)}" loading="lazy">`).join('');
    } else {
        imagesHtml = `<img src="/images/placeholder-airbnb.jpg" class="gallery-item" alt="${escapeHtml(prop.title)}" loading="lazy">`;
    }
    page = page.replace(/\{\{#each images\}\}[\s\S]*?\{\{\/each\}\}/, imagesHtml);
    
    // Features
    let featuresHtml = '';
    if (prop.features && prop.features.length) {
        featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
        featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>24/7 Security</li><li>High-speed WiFi</li>';
    }
    page = page.replace(/\{\{#each features\}\}[\s\S]*?\{\{\/each\}\}/, featuresHtml);
    
    // Amenities
    const amenities = [
        { icon: 'fa-wifi', name: 'High-speed WiFi' },
        { icon: 'fa-tv', name: 'Smart TV' },
        { icon: 'fa-snowflake', name: 'Air conditioning' },
        { icon: 'fa-utensils', name: 'Fully equipped kitchen' },
        { icon: 'fa-parking', name: 'Free parking' },
        { icon: 'fa-shield-alt', name: '24/7 security' }
    ];
    let amenitiesHtml = '';
    amenities.forEach(a => {
        amenitiesHtml += `<div class="amenity-item"><i class="fas ${a.icon}"></i><span>${a.name}</span></div>`;
    });
    page = page.replace(/\{\{#each amenities\}\}[\s\S]*?\{\{\/each\}\}/, amenitiesHtml);
    
    // Superhost badge
    const superhostHtml = '<div class="superhost-badge"><i class="fas fa-medal"></i> Superhost</div>';
    page = page.replace(/\{\{#if superhost\}\}[\s\S]*?\{\{\/if\}\}/, superhostHtml);
    
    // Similar Airbnb recommendations
    const similarAirbnbs = airbnbs.filter(a => a.id !== prop.id && a.estate === prop.estate).slice(0, 3);
    let recsHtml = '';
    similarAirbnbs.forEach(rec => {
        const recNightly = rec.price_night || Math.round(rec.price / 30);
        recsHtml += `
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
    });
    page = page.replace(/\{\{#each recommendations\}\}[\s\S]*?\{\{\/each\}\}/, recsHtml);
    
    // Reviews
    const reviewsHtml = `
    <div class="review-card">
        <div class="review-header">
            <strong>Sarah M.</strong>
            <div class="review-rating"><i class="fas fa-star"></i> 5</div>
        </div>
        <p>"Amazing stay! The apartment was spotless and exactly as described. The host was very responsive."</p>
        <span class="review-date">2 weeks ago</span>
    </div>
    <div class="review-card">
        <div class="review-header">
            <strong>James K.</strong>
            <div class="review-rating"><i class="fas fa-star"></i> 4.8</div>
        </div>
        <p>"Great location and value for money. Highly recommended for short stays in Nairobi."</p>
        <span class="review-date">1 month ago</span>
    </div>`;
    page = page.replace(/\{\{#each reviews\}\}[\s\S]*?\{\{\/each\}\}/, reviewsHtml);
    
    const outputPath = path.join(AIRBNB_OUTPUT_DIR, `${prop.slug}.html`);
    fs.writeFileSync(outputPath, page);
    console.log(`   ✅ Airbnb: ${prop.slug}.html (KES ${nightlyRate}/night)`);
});

console.log('\n' + '='.repeat(50));
console.log('🎉 GENERATION COMPLETE!');
console.log('='.repeat(50));
console.log(`   📁 Rentals: ${RENTAL_OUTPUT_DIR} (${rentals.length} files)`);
console.log(`   📁 Airbnb: ${AIRBNB_OUTPUT_DIR} (${airbnbs.length} files)`);
console.log('\n💡 Next steps:');
console.log('   1. Run: node server.js');
console.log('   2. Visit: http://localhost:3000/airbnb.html');
console.log('   3. Edit data/properties.json and re-run this script');