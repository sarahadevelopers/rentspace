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
const properties = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// ========== AUTO-GENERATE REVIEWS BASED ON PROPERTY ==========
const reviewTemplates = {
  // High-end estates (Karen, Kilimani, Hurlingham)
  luxury: [
    { name: "James M.", rating: 5, comment: "Absolutely stunning property! The attention to detail is impeccable. RentSpace made the entire process seamless." },
    { name: "Sarah K.", rating: 5, comment: "This property exceeded all expectations. The location is perfect and the service was world-class." },
    { name: "Michael O.", rating: 5, comment: "Exceptional quality and professionalism. The team handled everything with care and discretion." },
    { name: "Elizabeth W.", rating: 5, comment: "A truly luxurious experience from start to finish. Highly recommend RentSpace." },
    { name: "David N.", rating: 4, comment: "Beautiful property and excellent service. Would definitely use again." }
  ],
  // Mid-range estates (Ruiru, Ngong, Kitengela)
  midRange: [
    { name: "Peter M.", rating: 5, comment: "Great value for money. The property is exactly as described and the team was very helpful." },
    { name: "Grace A.", rating: 4, comment: "Very satisfied with the property. Good location and responsive service." },
    { name: "John K.", rating: 5, comment: "Smooth process from viewing to moving in. Highly recommended." },
    { name: "Lucy N.", rating: 4, comment: "Nice property, good neighborhood. RentSpace delivered as promised." },
    { name: "Robert O.", rating: 5, comment: "Excellent experience! The team went above and beyond." }
  ],
  // Apartment-specific
  apartment: [
    { name: "Ann W.", rating: 5, comment: "Modern, clean apartment with great amenities. The moving service was incredibly helpful." },
    { name: "Brian K.", rating: 4, comment: "Well-maintained building and responsive management. Happy with the choice." }
  ],
  // Villa/Bungalow specific
  villa: [
    { name: "Catherine M.", rating: 5, comment: "A dream home! Spacious, private, and beautifully designed. Worth every shilling." },
    { name: "Stephen L.", rating: 5, comment: "Exceptional property. The garden and outdoor space are perfect for entertaining." }
  ]
};

// Helper: Generate reviews for a property
function generateReviewsForProperty(property) {
  const estate = property.estate;
  const type = property.type;
  
  // Determine review pool based on estate
  let reviewPool = [];
  if (estate === 'Karen' || estate === 'Kilimani' || estate === 'Hurlingham') {
    reviewPool = [...reviewTemplates.luxury];
  } else {
    reviewPool = [...reviewTemplates.midRange];
  }
  
  // Add type-specific reviews if applicable
  if (type === 'Apartment' || type === 'Bedsitter' || type.includes('Bedroom')) {
    reviewPool = [...reviewPool, ...reviewTemplates.apartment];
  } else if (type === 'Bungalow' || type === 'Villa' || type === 'Mansionette') {
    reviewPool = [...reviewPool, ...reviewTemplates.villa];
  }
  
  // Randomly select 2-3 reviews for each property
  const reviewCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 reviews
  const shuffled = [...reviewPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, reviewCount);
}

// Helper: generate recommendations (similar properties)
function getSimilarProperties(property, allProps, max = 4) {
  // First try same estate
  let similar = allProps.filter(p => p.id !== property.id && p.estate === property.estate);
  
  // If not enough, add same price range
  if (similar.length < max) {
    const priceRange = property.price;
    const samePrice = allProps.filter(p => 
      p.id !== property.id && 
      p.estate !== property.estate &&
      Math.abs(p.price - priceRange) < 50000
    );
    similar = [...similar, ...samePrice];
  }
  
  // If still not enough, add random from same area type
  if (similar.length < max) {
    const areaType = property.estate === 'Karen' || property.estate === 'Kilimani' || property.estate === 'Hurlingham' ? 'high-end' : 'mid-range';
    const areaMatch = allProps.filter(p => {
      const isHighEnd = p.estate === 'Karen' || p.estate === 'Kilimani' || p.estate === 'Hurlingham';
      return p.id !== property.id && ((areaType === 'high-end' && isHighEnd) || (areaType === 'mid-range' && !isHighEnd));
    });
    similar = [...similar, ...areaMatch];
  }
  
  // Remove duplicates and limit
  similar = similar.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  return similar.slice(0, max);
}

// Helper: generate gallery HTML from images array
function generateGallery(images) {
  if (!images || images.length === 0) {
    return `
      <div class="property-gallery">
        <div class="main-image">
          <img id="mainImage" src="/images/placeholder.jpg" alt="Property">
        </div>
      </div>
    `;
  }
  
  const mainImage = images[0];
  const thumbnails = images.map((img, idx) => `
    <img class="thumb ${idx === 0 ? 'active' : ''}" src="${img}" alt="Thumbnail ${idx + 1}" onclick="switchImage(this)">
  `).join('');
  
  return `
    <div class="property-gallery">
      <div class="main-image">
        <img id="mainImage" src="${mainImage}" alt="Property main image">
      </div>
      <div class="thumbnails">
        ${thumbnails}
      </div>
    </div>
  `;
}

// Helper: generate recommendations HTML
function generateRecommendations(recommendations) {
  if (!recommendations || recommendations.length === 0) return '';
  
  const cards = recommendations.map(rec => `
    <a href="/property/${rec.slug}.html" class="rec-card">
      <div class="rec-card-image">
        <img src="${rec.images?.[0] || '/images/placeholder.jpg'}" alt="${rec.title}" loading="lazy">
      </div>
      <div class="rec-card-info">
        <h4>${rec.title}</h4>
        <p>${rec.estate} · KES ${rec.price.toLocaleString()} / mo</p>
      </div>
    </a>
  `).join('');
  
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

// Helper: generate reviews HTML
function generateReviews(reviews) {
  if (!reviews || reviews.length === 0) return '';
  
  const cards = reviews.map(review => `
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

// Helper: compute average rating
function computeAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

// Generate each property page
properties.forEach(prop => {
  // Auto-generate reviews (no manual writing needed!)
  const reviews = generateReviewsForProperty(prop);
  prop.reviews = reviews;
  
  // Generate recommendations
  const recommendations = getSimilarProperties(prop, properties);
  prop.recommendations = recommendations;
  
  // Compute stats
  const avgRating = computeAverageRating(reviews);
  const reviewCount = reviews.length;
  
  // Generate HTML sections
  const galleryHtml = generateGallery(prop.images);
  const recommendationsHtml = generateRecommendations(prop.recommendations);
  const reviewsHtml = generateReviews(prop.reviews);
  
  // Build features list HTML
  const featuresHtml = (prop.features || []).map(f => `<li>${f}</li>`).join('');
  
  // Prepare data for replacement
  const imageUrl = prop.images?.[0] || '/images/placeholder.jpg';
  const encodedTitle = encodeURIComponent(prop.title);
  const priceFormatted = prop.price.toLocaleString();
  const description = prop.description || `A beautiful ${prop.type} in ${prop.estate}, Nairobi.`;
  
  // Simple placeholder replacements
  let content = template
    .replace(/{{gallery}}/g, galleryHtml)
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
    .replace(/{{reviewCount}}/g, reviewCount);
  
  // Write the file
  const filename = `${prop.slug}.html`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Generated: /property/${filename} (${reviews.length} reviews, ${recommendations.length} recommendations)`);
});

console.log(`\n🎉 Successfully generated ${properties.length} property pages with auto-generated reviews!`);