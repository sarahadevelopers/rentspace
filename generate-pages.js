const fs = require('fs');
const path = require('path');

// Configuration
const DATA_PATH = path.join(__dirname, 'data', 'properties.json');
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'property-template.html');
const OUTPUT_DIR = path.join(__dirname, 'property');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Read template
let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Read properties
const originalProperties = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// ========== AIRBNB / SHORT-TERM CONFIGURATION ==========
// Estates that are eligible for short-term/Airbnb rentals
const AIRBNB_ELIGIBLE_ESTATES = [
  'Karen', 'Kilimani', 'Hurlingham', 'Westlands', 'Lavington', 'Kileleshwa', 'Runda', 'Muthaiga'
];

// Property types that work well for short-term stays
const AIRBNB_PROPERTY_TYPES = ['Bedsitter', '1 Bedroom', '2 Bedroom', 'Studio'];

// Airbnb pricing templates (nightly rates)
const airbnbNightlyRates = {
  Bedsitter: 3500,
  '1 Bedroom': 5500,
  '2 Bedroom': 8500,
  '3 Bedroom': 12000,
  '4 Bedroom': 18000,
  Bungalow: 15000,
  Mansionette: 20000
};

// Function to determine if property is eligible for short-term/Airbnb
function isAirbnbEligible(property) {
  return AIRBNB_ELIGIBLE_ESTATES.includes(property.estate) && 
         AIRBNB_PROPERTY_TYPES.includes(property.type);
}

// Function to add Airbnb data to property
function addAirbnbData(property, isAirbnb) {
  const nightlyRate = airbnbNightlyRates[property.type] || 8000;
  const weeklyRate = nightlyRate * 6; // 6 nights = 1 night free
  const monthlyRate = nightlyRate * 25; // 25 nights = discounted monthly rate
  
  if (isAirbnb) {
    return {
      ...property,
      // Rental type classification
      rental_type: 'short_term',
      available_for: 'short_term',
      is_airbnb_ready: true,
      
      // Short-term pricing
      price_night: nightlyRate,
      price_week: weeklyRate,
      price_month_short: monthlyRate,
      min_stay_nights: 2,
      
      // Airbnb-specific fields
      airbnb_rating: (Math.random() * (5 - 4.5) + 4.5).toFixed(1),
      airbnb_reviews: Math.floor(Math.random() * 100) + 20,
      airbnb_superhost: Math.random() > 0.7,
      
      // Furnishing level
      furnishing_level: 'fully_furnished',
      is_furnished: true,
      
      // Short-stay amenities
      short_stay_amenities: [
        'High-speed WiFi', 'Smart TV', 'Fully equipped kitchen', 
        'Air conditioning', 'Washer/Dryer', 'Fresh linens', 
        'Toiletries', '24/7 check-in', 'Self check-in', 'Workspace'
      ]
    };
  } else {
    return {
      ...property,
      // Rental type classification
      rental_type: 'long_term',
      available_for: 'long_term',
      is_airbnb_ready: false,
      
      // Long-term pricing
      price_night: null,
      price_week: null,
      price_month_short: null,
      min_stay_nights: null,
      
      // Airbnb fields (null)
      airbnb_rating: null,
      airbnb_reviews: null,
      airbnb_superhost: false,
      
      // Furnishing level
      furnishing_level: 'partially_furnished',
      is_furnished: false,
      
      // No short-stay amenities
      short_stay_amenities: []
    };
  }
}

// ========== AUTO-GENERATE REVIEWS BASED ON PROPERTY ==========
const reviewTemplates = {
  luxury: [
    { name: "James M.", rating: 5, comment: "Absolutely stunning property! The attention to detail is impeccable. RentSpace made the entire process seamless." },
    { name: "Sarah K.", rating: 5, comment: "This property exceeded all expectations. The location is perfect and the service was world-class." },
    { name: "Michael O.", rating: 5, comment: "Exceptional quality and professionalism. The team handled everything with care and discretion." },
    { name: "Elizabeth W.", rating: 5, comment: "A truly luxurious experience from start to finish. Highly recommend RentSpace." },
    { name: "David N.", rating: 4, comment: "Beautiful property and excellent service. Would definitely use again." }
  ],
  midRange: [
    { name: "Peter M.", rating: 5, comment: "Great value for money. The property is exactly as described and the team was very helpful." },
    { name: "Grace A.", rating: 4, comment: "Very satisfied with the property. Good location and responsive service." },
    { name: "John K.", rating: 5, comment: "Smooth process from viewing to moving in. Highly recommended." },
    { name: "Lucy N.", rating: 4, comment: "Nice property, good neighborhood. RentSpace delivered as promised." },
    { name: "Robert O.", rating: 5, comment: "Excellent experience! The team went above and beyond." }
  ],
  apartment: [
    { name: "Ann W.", rating: 5, comment: "Modern, clean apartment with great amenities. The moving service was incredibly helpful." },
    { name: "Brian K.", rating: 4, comment: "Well-maintained building and responsive management. Happy with the choice." }
  ],
  villa: [
    { name: "Catherine M.", rating: 5, comment: "A dream home! Spacious, private, and beautifully designed. Worth every shilling." },
    { name: "Stephen L.", rating: 5, comment: "Exceptional property. The garden and outdoor space are perfect for entertaining." }
  ],
  shortStay: [
    { name: "Emma W.", rating: 5, comment: "Perfect short-stay experience! The place was immaculate and exactly as described. Host was very responsive." },
    { name: "Thomas L.", rating: 5, comment: "Great location for a weekend getaway. Would definitely book again!" },
    { name: "Lisa K.", rating: 4, comment: "Beautiful property, well-equipped for a short stay. Highly recommended." },
    { name: "Mark T.", rating: 5, comment: "Best Airbnb experience in Nairobi! The place had everything we needed." },
    { name: "Sophie R.", rating: 5, comment: "Amazing location, stunning views, and wonderful host. Will return!" }
  ]
};

function generateReviewsForProperty(property) {
  const estate = property.estate;
  const type = property.type;
  const isShortStay = property.available_for === 'short_term';
  
  let reviewPool = [];
  if (estate === 'Karen' || estate === 'Kilimani' || estate === 'Hurlingham' || estate === 'Westlands') {
    reviewPool = [...reviewTemplates.luxury];
  } else {
    reviewPool = [...reviewTemplates.midRange];
  }
  
  if (type === 'Apartment' || type === 'Bedsitter' || type.includes('Bedroom')) {
    reviewPool = [...reviewPool, ...reviewTemplates.apartment];
  } else if (type === 'Bungalow' || type === 'Villa' || type === 'Mansionette') {
    reviewPool = [...reviewPool, ...reviewTemplates.villa];
  }
  
  if (isShortStay) {
    reviewPool = [...reviewPool, ...reviewTemplates.shortStay];
  }
  
  const reviewCount = Math.floor(Math.random() * 2) + 2;
  const shuffled = [...reviewPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, reviewCount);
}

function getSimilarProperties(property, allProps, max = 4) {
  let similar = allProps.filter(p => {
    if (p.id === property.id) return false;
    return p.estate === property.estate && p.rental_type === property.rental_type;
  });
  
  if (similar.length < max) {
    const priceRange = property.price;
    const samePrice = allProps.filter(p => {
      if (p.id === property.id) return false;
      return p.estate !== property.estate && 
             p.rental_type === property.rental_type &&
             Math.abs(p.price - priceRange) < 50000;
    });
    similar = [...similar, ...samePrice];
  }
  
  if (similar.length < max) {
    const areaType = AIRBNB_ELIGIBLE_ESTATES.includes(property.estate) ? 'high-end' : 'mid-range';
    const areaMatch = allProps.filter(p => {
      if (p.id === property.id) return false;
      const isHighEnd = AIRBNB_ELIGIBLE_ESTATES.includes(p.estate);
      return ((areaType === 'high-end' && isHighEnd) || (areaType === 'mid-range' && !isHighEnd)) &&
             p.rental_type === property.rental_type;
    });
    similar = [...similar, ...areaMatch];
  }
  
  similar = similar.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  return similar.slice(0, max);
}

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
  
  return `
    <section class="recommendations">
      <div class="section-header">
        <h2>Similar Curations</h2>
        <div class="section-line"></div>
      </div>
      <div class="recommendation-cards">
        ${cards}
      </div>
    </section>
  `;
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
  
  return `
    <section class="testimonials">
      <div class="section-header">
        <h2>The Experience</h2>
        <div class="section-line"></div>
      </div>
      <div class="testimonials-list">
        ${cards}
      </div>
    </section>
  `;
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
          ${property.short_stay_amenities.map(amenity => `<span><i class="fas fa-check"></i> ${amenity}</span>`).join('')}
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

// ========== MAIN GENERATION PROCESS ==========
console.log('📊 Adding rental type data to all properties...\n');

// STEP 1: Find eligible properties for Airbnb
const eligibleProperties = originalProperties.filter(p => isAirbnbEligible(p));
const shuffledEligible = [...eligibleProperties];
for (let i = shuffledEligible.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffledEligible[i], shuffledEligible[j]] = [shuffledEligible[j], shuffledEligible[i]];
}
const selectedAirbnbIds = shuffledEligible.slice(0, 20).map(p => p.id);

console.log(`📊 Selected ${selectedAirbnbIds.length} properties for Airbnb/Short-stay`);
console.log(`   Long-term properties: ${originalProperties.length - selectedAirbnbIds.length}`);
console.log(`   Total: ${originalProperties.length} properties\n`);

// STEP 2: Add full Airbnb data to all properties
const allProperties = originalProperties.map(prop => {
  const isAirbnb = selectedAirbnbIds.includes(prop.id);
  return addAirbnbData(prop, isAirbnb);
});

// STEP 3: Save updated properties back to JSON
fs.writeFileSync(DATA_PATH, JSON.stringify(allProperties, null, 2));
console.log('✅ Updated properties.json with Airbnb/rental flags\n');

// STEP 4: Generate each property page
let shortStayCount = 0;
let longTermCount = 0;

// Placeholder URLs for fallback
const mainPlaceholder = 'https://placehold.co/800x600/1a1a1a/c9a45c?text=No+Image';
const thumbPlaceholder = 'https://placehold.co/80x80/1a1a1a/c9a45c?text=Err';

allProperties.forEach(prop => {
  if (prop.rental_type === 'short_term') shortStayCount++;
  else longTermCount++;

  // Auto-generate reviews
  const reviews = generateReviewsForProperty(prop);
  prop.reviews = reviews;

  // Generate recommendations
  const recommendations = getSimilarProperties(prop, allProperties);
  prop.recommendations = recommendations;

  const avgRating = computeAverageRating(reviews);
  const reviewCount = reviews.length;

  // --- Build gallery HTML (mainImage + thumbnails) ---
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

  // Features list HTML
  const featuresHtml = (prop.features || []).map(f => `<li>${f}</li>`).join('');

  // Other prepared values
  const imageUrl = prop.images?.[0] || '/images/placeholder.jpg';
  const encodedTitle = encodeURIComponent(prop.title);
  const priceFormatted = prop.price.toLocaleString();
  const description = prop.description || `A beautiful ${prop.type} in ${prop.estate}, Nairobi.`;
  const locationSlug = getLocationSlug(prop.estate);
  const rentalType = getRentalTypeDisplay(prop);
  const recommendationsHtml = generateRecommendations(prop.recommendations);
  const reviewsHtml = generateReviews(prop.reviews);
  const shortTermHtml = generateShortTermSection(prop);

  // Replace all placeholders in one go
  let content = template
    .replace(/{{mainImage}}/g, mainImageHtml)
    .replace(/{{thumbnails}}/g, thumbnailsHtml)
    .replace(/{{title}}/g, prop.title)
    .replace(/{{description}}/g, description)
    .replace(/{{imageUrl}}/g, imageUrl)
    .replace(/{{estate}}/g, prop.estate)
    .replace(/{{price}}/g, priceFormatted)
    .replace(/{{sqft}}/g, prop.specs.sqft)
    .replace(/{{bedrooms}}/g, prop.specs.bedrooms)
    .replace(/{{bathrooms}}/g, prop.specs.bathrooms)
    .replace(/{{parking}}/g, prop.specs.parking)
    .replace(/{{featuresList}}/g, featuresHtml)
    .replace(/{{encodedTitle}}/g, encodedTitle)
    .replace(/{{fumigationLink}}/g, prop.fumigationLink)
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

  // Write the file
  const filename = `${prop.slug}.html`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, content);

  const stayType = prop.rental_type === 'short_term' ? '✨ Airbnb/Short-stay' : '🏠 Long-term';
  console.log(`✅ Generated: /property/${filename} | ${stayType} | ${reviews.length} reviews | ${recommendations.length} recs`);
});

console.log(`\n🎉 Successfully generated ${allProperties.length} property pages with auto-generated reviews!`);
console.log(`   📊 Breakdown:`);
console.log(`      🏠 Long-term rentals: ${longTermCount} properties`);
console.log(`      ✨ Short-stay / Airbnb: ${shortStayCount} properties`);
console.log(`\n   📍 Airbnb-eligible estates: ${AIRBNB_ELIGIBLE_ESTATES.join(', ')}`);
console.log(`   🏷️  Airbnb-eligible types: ${AIRBNB_PROPERTY_TYPES.join(', ')}`);
console.log(`\n   💡 Tip: Airbnb properties have nightly rates and special amenities!`);
console.log(`\n   ✅ Airbnb flags saved to properties.json - Your airbnb.html will now show these properties!`);