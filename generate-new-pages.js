const fs = require('fs');
const path = require('path');

// ========== CONFIGURATION ==========
const DATA_PATH = path.join(__dirname, 'data', 'properties.json');
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'property-template.html');
const OUTPUT_DIR = path.join(__dirname, 'property');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Read template
let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Read existing properties
const allProperties = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Helper: get existing file names in the property folder (without .html)
const existingFiles = fs.readdirSync(OUTPUT_DIR)
  .filter(f => f.endsWith('.html'))
  .map(f => f.replace('.html', ''));

console.log(`📁 Found ${existingFiles.length} existing property files.`);
console.log(`📊 Total properties in JSON: ${allProperties.length}`);

// ========== FUNCTIONS (copied from your original generate-pages.js) ==========
// These are needed to correctly render the page. I've kept them unchanged.

function generateRecommendations(recommendations) {
  if (!recommendations || recommendations.length === 0) return '';
  const placeholder = 'https://placehold.co/800x600/1a1a1a/c9a45c?text=No+Image';
  
  return recommendations.map(rec => {
    const isShortStay = rec.rental_type === 'short_term';
    const priceDisplay = isShortStay ? `KES ${rec.price_night?.toLocaleString()}/night` : `KES ${rec.price.toLocaleString()}/mo`;
    
    return `
    <a href="/property/${rec.slug}.html" class="rec-card">
      <div class="rec-card-image">
        <img src="${rec.images?.[0] || '/images/placeholder.jpg'}" alt="${rec.title}" loading="lazy" onerror="this.src='${placeholder}'">
      </div>
      <div class="rec-card-info">
        <h4>${rec.title}</h4>
        <p>${rec.estate} · ${priceDisplay}</p>
        ${isShortStay ? '<span class="airbnb-tag"><i class="fab fa-airbnb"></i> Short-stay</span>' : ''}
      </div>
    </a>`;
  }).join('');
}

function generateReviews(reviews) {
  if (!reviews || reviews.length === 0) return '';
  return reviews.map(review => `
    <div class="testimonial-card">
      <div class="testimonial-content">
        <i class="fas fa-quote-left"></i>
        <p>"${review.comment}"</p>
      </div>
      <div class="testimonial-author">
        <strong>${review.name}</strong>
        <span>Verified Client</span>
      </div>
    </div>
  `).join('');
}

function computeAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

function generateShortTermSection(property) {
  if (property.rental_type !== 'short_term') return '';
  
  const priceNight = property.price_night ? property.price_night.toLocaleString() : '';
  const priceWeek = property.price_week ? property.price_week.toLocaleString() : '';
  const priceMonth = property.price_month_short ? property.price_month_short.toLocaleString() : '';
  
  return `
    <div class="short-term-section" id="shortTermSection">
      <div class="short-term-header">
        <div class="airbnb-badge-large">
          <i class="fab fa-airbnb"></i> Short-stay / Airbnb
        </div>
      </div>
      <div class="short-term-pricing">
        <div class="price-row">
          <span class="price-label">Nightly Rate</span>
          <span class="price-value">KES ${priceNight}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Weekly Rate</span>
          <span class="price-value">KES ${priceWeek}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Monthly Rate</span>
          <span class="price-value">KES ${priceMonth}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Minimum Stay</span>
          <span class="price-value">${property.min_stay_nights || 2} nights</span>
        </div>
      </div>
      ${property.airbnb_rating ? `
      <div class="airbnb-rating">
        <i class="fab fa-airbnb"></i>
        <span class="rating">${property.airbnb_rating}</span>
        <span class="reviews">(${property.airbnb_reviews} reviews)</span>
        ${property.airbnb_superhost ? '<span class="superhost">Superhost</span>' : ''}
      </div>
      ` : ''}
      <div class="short-term-amenities">
        <h4>Short-stay amenities</h4>
        <div class="amenities-list">
          ${(property.short_stay_amenities || []).map(amenity => `<span><i class="fas fa-check"></i> ${amenity}</span>`).join('')}
        </div>
      </div>
      <a href="https://wa.me/254723562484?text=I'm%20interested%20in%20${encodeURIComponent(property.title)}%20for%20short-term%20stay" class="airbnb-book-btn">
        <i class="fab fa-airbnb"></i> Book Short Stay
      </a>
    </div>
  `;
}

function getLocationSlug(estate) {
  const locationMap = {
    'Karen': 'karen', 'Kilimani': 'kilimani', 'Hurlingham': 'hurlingham',
    'Syokimau': 'syokimau', 'Ngong': 'ngong', 'Kitengela': 'kitengela',
    'Westlands': 'westlands', 'Lavington': 'lavington', 'Kileleshwa': 'kileleshwa',
    'Runda': 'runda', 'Muthaiga': 'muthaiga'
  };
  return locationMap[estate] || estate.toLowerCase();
}

function getRentalTypeDisplay(property) {
  return property.rental_type === 'short_term' ? 'short-stay' : 'long-term';
}

// ========== GENERATE ONLY MISSING PROPERTIES ==========
let generatedCount = 0;
let skippedCount = 0;

const mainPlaceholder = 'https://placehold.co/800x600/1a1a1a/c9a45c?text=No+Image';
const thumbPlaceholder = 'https://placehold.co/80x80/1a1a1a/c9a45c?text=Err';

allProperties.forEach(prop => {
  const slug = prop.slug;
  const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);
  
  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️ Skipping existing: ${slug}.html (preserved)`);
    skippedCount++;
    return;
  }
  
  // Otherwise, generate the page
  console.log(`🔄 Generating new: ${slug}.html`);
  
  // --- Build gallery HTML ---
  let mainImageHtml = '';
  let thumbnailsHtml = '';
  
  if (prop.images && prop.images.length) {
    mainImageHtml = `<img src="${prop.images[0]}" alt="${prop.title}" id="mainGalleryImg" loading="lazy" onerror="this.src='${mainPlaceholder}'">`;
    thumbnailsHtml = prop.images.map((img, idx) => `
        <div class="thumb" data-index="${idx}" onclick="switchImage(this)">
            <img src="${img}" alt="View ${idx}" loading="lazy" onerror="this.src='${thumbPlaceholder}'">
        </div>
    `).join('');
  } else {
    mainImageHtml = `<img src="${mainPlaceholder}" alt="${prop.title}" id="mainGalleryImg" loading="lazy">`;
    thumbnailsHtml = `<div class="thumb" data-index="0" onclick="switchImage(this)"><img src="${thumbPlaceholder}" alt="View 0" loading="lazy"></div>`;
  }
  
  const featuresHtml = (prop.features || []).map(f => `<li>${f}</li>`).join('');
  const imageUrl = prop.images?.[0] || '/images/placeholder.jpg';
  const encodedTitle = encodeURIComponent(prop.title);
  const priceFormatted = prop.price.toLocaleString();
  const description = prop.description || `A beautiful ${prop.type} in ${prop.estate}, Nairobi.`;
  const locationSlug = getLocationSlug(prop.estate);
  const rentalType = getRentalTypeDisplay(prop);
  
  // Generate reviews & recommendations using existing data or create minimal ones
  // Note: If the property doesn't have reviews in JSON, we need to generate them (similar logic)
  let reviews = prop.reviews || [];
  if (reviews.length === 0) {
    // minimal fallback – you could copy the review generation from original script
    reviews = [{ name: "Verified Guest", rating: 5, comment: "Great property!" }];
  }
  const avgRating = computeAverageRating(reviews);
  const reviewCount = reviews.length;
  
  const recommendations = prop.recommendations || [];
  const recommendationsHtml = generateRecommendations(recommendations);
  const reviewsHtml = generateReviews(reviews);
  const shortTermHtml = generateShortTermSection(prop);
  
  let content = template
    .replace(/{{mainImage}}/g, mainImageHtml)
    .replace(/{{thumbnails}}/g, thumbnailsHtml)
    .replace(/{{title}}/g, prop.title)
    .replace(/{{description}}/g, description)
    .replace(/{{imageUrl}}/g, imageUrl)
    .replace(/{{estate}}/g, prop.estate)
    .replace(/{{price}}/g, priceFormatted)
    .replace(/{{sqft}}/g, prop.specs?.sqft || 'N/A')
    .replace(/{{bedrooms}}/g, prop.specs?.bedrooms || 0)
    .replace(/{{bathrooms}}/g, prop.specs?.bathrooms || 0)
    .replace(/{{parking}}/g, prop.specs?.parking || 0)
    .replace(/{{featuresList}}/g, featuresHtml)
    .replace(/{{encodedTitle}}/g, encodedTitle)
    .replace(/{{fumigationLink}}/g, prop.fumigationLink || 'https://fumigo.co.ke')
    .replace(/{{recommendations}}/g, recommendationsHtml)
    .replace(/{{reviews}}/g, reviewsHtml)
    .replace(/{{averageRating}}/g, avgRating)
    .replace(/{{reviewCount}}/g, reviewCount)
    .replace(/{{short_term_section}}/g, shortTermHtml)
    .replace(/{{location_slug}}/g, locationSlug)
    .replace(/{{rental_type}}/g, rentalType)
    .replace(/{{price_night}}/g, prop.price_night ? prop.price_night.toLocaleString() : '')
    .replace(/{{price_week}}/g, prop.price_week ? prop.price_week.toLocaleString() : '')
    .replace(/{{price_month_short}}/g, prop.price_month_short ? prop.price_month_short.toLocaleString() : '')
    .replace(/{{min_stay_nights}}/g, prop.min_stay_nights || '')
    .replace(/{{airbnb_rating}}/g, prop.airbnb_rating || '')
    .replace(/{{airbnb_reviews}}/g, prop.airbnb_reviews || '');
  
  fs.writeFileSync(outputPath, content);
  generatedCount++;
});

console.log(`\n🎉 Done! Generated ${generatedCount} new property pages, skipped ${skippedCount} existing.`);