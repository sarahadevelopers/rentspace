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

// Generate each Airbnb page
airbnbProperties.forEach(prop => {
    let page = template;
    
    // Calculate nightly rate if not present
    const nightlyRate = prop.price_night || Math.round(prop.price / 30);
    const weeklyRate = nightlyRate * 6;
    const weeklySave = Math.round(((nightlyRate * 7) - weeklyRate) / (nightlyRate * 7) * 100);
    
    // Basic replacements
    page = page.replace(/\{\{title\}\}/g, escapeHtml(prop.title));
    page = page.replace(/\{\{description\}\}/g, escapeHtml(prop.description || 'Beautiful ' + prop.type + ' in ' + prop.estate));
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
    
    // Handle images
    let imagesHtml = '';
    if (prop.images && prop.images.length) {
        imagesHtml = prop.images.map(img => `<img src="${img}" class="gallery-item" alt="${escapeHtml(prop.title)}" loading="lazy">`).join('');
    } else {
        imagesHtml = `<img src="/images/placeholder-airbnb.jpg" class="gallery-item" alt="${escapeHtml(prop.title)}" loading="lazy">`;
    }
    page = page.replace(/\{\{#each images\}\}[\s\S]*?\{\{\/each\}\}/, imagesHtml);
    
    // Handle features
    let featuresHtml = '';
    if (prop.features && prop.features.length) {
        featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
        featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>24/7 Security</li><li>High-speed WiFi</li>';
    }
    page = page.replace(/\{\{#each features\}\}[\s\S]*?\{\{\/each\}\}/, featuresHtml);
    
    // Handle amenities
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
    
    // Handle superhost badge
    const superhostHtml = '<div class="superhost-badge"><i class="fas fa-medal"></i> Superhost</div>';
    page = page.replace(/\{\{#if superhost\}\}[\s\S]*?\{\{\/if\}\}/, superhostHtml);
    
    // Handle recommendations (similar Airbnb properties)
    const similarProps = airbnbProperties.filter(p => p.id !== prop.id).slice(0, 3);
    let recsHtml = '';
    similarProps.forEach(rec => {
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
    
    // Handle reviews
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
    
    // Write the file
    const outputPath = path.join(airbnbDir, `${prop.slug}.html`);
    fs.writeFileSync(outputPath, page);
    console.log(`Generated: /airbnb/${prop.slug}.html - ${prop.title} (KES ${nightlyRate}/night)`);
});

console.log(`\nDone! Generated ${airbnbProperties.length} Airbnb pages in /airbnb/ folder`);