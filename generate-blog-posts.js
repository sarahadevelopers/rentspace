// generate-blog-posts.js
// Fully automatic blog post generator - creates 1000+ unique, SEO-optimized posts with Airbnb recommendations

const fs = require('fs');
const path = require('path');
const blogConfig = require('./data/blog-data.js');

const BLOG_DIR = path.join(__dirname, 'blog');
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'blog-post-template.html');
const BLOG_LISTING_PATH = path.join(__dirname, 'blog.html');
const PROPERTIES_PATH = path.join(__dirname, 'data', 'properties.json');

// Ensure blog directory exists
if (!fs.existsSync(BLOG_DIR)) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
}

// Read template
let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Load properties for Airbnb recommendations
let allProperties = [];
try {
  if (fs.existsSync(PROPERTIES_PATH)) {
    allProperties = JSON.parse(fs.readFileSync(PROPERTIES_PATH, 'utf8'));
    console.log(`📊 Loaded ${allProperties.length} properties for recommendations\n`);
  }
} catch (error) {
  console.log('⚠️ Could not load properties.json, Airbnb recommendations will be placeholder');
}

// Helper: Get random item from array
function randomItem(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Format price range
function formatPriceRange(min, max) {
  if (min >= 1000) {
    return `KES ${min.toLocaleString()} to ${max.toLocaleString()}`;
  }
  return `KES ${min.toLocaleString()} - ${max.toLocaleString()}`;
}

// Helper: Get properties by location (long-term)
function getPropertiesByLocation(locationName, limit = 3) {
  if (!allProperties.length) return [];
  if (!locationName) return [];
  
  const locationLower = locationName.toLowerCase();
  const filtered = allProperties.filter(p => 
    p.estate && p.estate.toLowerCase() === locationLower &&
    (!p.available_for || p.available_for.includes('long_term'))
  );
  
  return filtered.slice(0, limit);
}

// Helper: Get Airbnb properties by location
function getAirbnbPropertiesByLocation(locationName, limit = 3) {
  if (!allProperties.length) return [];
  if (!locationName) return [];
  
  const locationLower = locationName.toLowerCase();
  let filtered = allProperties.filter(p => 
    p.estate && p.estate.toLowerCase() === locationLower &&
    p.available_for && p.available_for.includes('short_term')
  );
  
  // If not enough, get from nearby areas
  if (filtered.length < limit) {
    const nearbyEstates = getNearbyEstates(locationLower);
    const nearbyProps = allProperties.filter(p => 
      p.estate && nearbyEstates.includes(p.estate.toLowerCase()) &&
      p.available_for && p.available_for.includes('short_term')
    );
    filtered = [...filtered, ...nearbyProps];
  }
  
  // Remove duplicates and limit
  filtered = filtered.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  return filtered.slice(0, limit);
}

// Helper: Get nearby estates
function getNearbyEstates(category) {
  const nearbyMap = {
    'kitengela': ['athi river', 'syokimau', 'machakos'],
    'ngong': ['kibiko', 'matasia', 'karen'],
    'ruiru': ['kamakis', 'tatu city', 'juja'],
    'karen': ['langata', 'hardy', 'miotoni'],
    'kilimani': ['hurlingham', 'lavington', 'kileleshwa'],
    'hurlingham': ['kilimani', 'upper hill', 'cbd']
  };
  return nearbyMap[category] || [];
}

// Helper: Generate long-term property recommendations HTML
function generatePropertyRecommendationsHTML(properties, locationName) {
  if (!properties.length) {
    return `
      <div class="recommendation-grid">
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <i class="fas fa-home" style="font-size: 48px; color: var(--gold); opacity: 0.5; margin-bottom: 1rem;"></i>
          <h4 style="font-size: 18px; font-weight: 400;">No long-term properties currently listed in ${locationName}</h4>
          <p style="color: var(--text-secondary); margin-top: 0.5rem;">Contact our concierge for off-market opportunities.</p>
          <a href="/contact.html" style="display: inline-block; margin-top: 1rem; background: var(--gold); color: #000; padding: 10px 24px; border-radius: 40px; text-decoration: none; font-weight: 500;">Contact Concierge →</a>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="recommendation-grid">
      ${properties.map(prop => `
        <a href="/property/${prop.slug}.html" class="rec-property-card">
          <img src="${prop.images?.[0] || '/images/placeholder.jpg'}" alt="${prop.title}" class="rec-property-image" loading="lazy">
          <div class="rec-property-info">
            <h4 class="rec-property-title">${escapeHtml(prop.title)}</h4>
            <div class="rec-property-location">${prop.estate}, Nairobi</div>
            <div class="rec-property-features">
              <span><i class="fas fa-bed"></i> ${prop.specs?.bedrooms || 0}</span>
              <span><i class="fas fa-bath"></i> ${prop.specs?.bathrooms || 0}</span>
              <span><i class="fas fa-car"></i> ${prop.specs?.parking || 0}</span>
            </div>
            <div class="rec-property-price">KES ${prop.price.toLocaleString()} / month</div>
            <div class="rec-property-cta">View Details →</div>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

// Helper: Generate Airbnb recommendations HTML
function generateAirbnbRecommendationsHTML(properties, locationName) {
  if (!properties.length) {
    return `
      <div class="airbnb-empty">
        <i class="fab fa-airbnb"></i>
        <p>No short-stay properties currently available in ${locationName}.</p>
        <p>Contact our concierge for personalized assistance or check back later.</p>
        <a href="/contact.html" class="airbnb-contact-btn">Contact Concierge →</a>
      </div>
    `;
  }
  
  return `
    <div class="airbnb-recommendation-grid">
      ${properties.map(prop => `
        <a href="/property/${prop.slug}.html" class="airbnb-card">
          <div class="airbnb-card-image">
            <img src="${prop.images?.[0] || '/images/placeholder.jpg'}" alt="${prop.title}" loading="lazy">
            <span class="airbnb-badge"><i class="fab fa-airbnb"></i> Short-stay</span>
          </div>
          <div class="airbnb-card-info">
            <h4>${escapeHtml(prop.title)}</h4>
            <p class="airbnb-location"><i class="fas fa-map-marker-alt"></i> ${prop.estate}, Nairobi</p>
            <div class="airbnb-features">
              <span><i class="fas fa-bed"></i> ${prop.specs?.bedrooms || 0}</span>
              <span><i class="fas fa-bath"></i> ${prop.specs?.bathrooms || 0}</span>
              <span><i class="fas fa-users"></i> ${(prop.specs?.bedrooms || 0) * 2} guests</span>
            </div>
            <div class="airbnb-rating">
              <i class="fas fa-star"></i>
              <span>${prop.airbnb_rating || '4.9'}</span>
              <span class="reviews">(${prop.airbnb_reviews || 25} reviews)</span>
            </div>
            <div class="airbnb-price">
              <span class="nightly">KES ${prop.price_night?.toLocaleString() || prop.price.toLocaleString()}<span>/night</span></span>
              <span class="book-btn">Book Now →</span>
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

// Helper: Generate rent table HTML
function generateRentTable(config, location) {
  const ranges = config.rentRanges;
  let tableHtml = `
    <div class="price-table">
      <table>
        <thead>
          <tr><th>Property Type</th><th>Average Rent (KES)</th><th>Popular Locations</th></tr>
        </thead>
        <tbody>
  `;
  
  for (const [type, range] of Object.entries(ranges)) {
    const displayType = type.replace(/([A-Z])/g, ' $1').trim();
    const priceRange = formatPriceRange(range[0], range[1]);
    const popularLocation = randomItem(config.estates);
    tableHtml += `<tr><td>${displayType}</td><td>${priceRange}</td><td>${popularLocation}</td></tr>`;
  }
  
  tableHtml += `</tbody></table></div>`;
  return tableHtml;
}

// Helper: Generate estate section HTML
function generateEstatesSection(config, location) {
  let html = `<h2>Top Estates in ${location.name}</h2>`;
  
  const featuredEstates = config.estates.slice(0, 4);
  featuredEstates.forEach(estate => {
    const priceRange = formatPriceRange(
      config.rentRanges[Object.keys(config.rentRanges)[0]][0],
      config.rentRanges[Object.keys(config.rentRanges)[0]][1]
    );
    
    html += `
      <h3>${estate}</h3>
      <p>${estate} is one of the most sought-after areas in ${location.name}, known for its ${randomItem(['secure environment', 'modern infrastructure', 'family-friendly atmosphere', 'excellent amenities'])}. Properties here range from ${randomItem(['modern apartments', 'spacious bungalows', 'executive maisonettes'])} with prices typically starting from ${priceRange}.</p>
    `;
  });
  
  return html;
}

// Helper: Generate amenities section
function generateAmenitiesSection(config, location) {
  const amenities = config.amenities.slice(0, 5);
  let html = `<h2>Shopping & Amenities</h2><ul>`;
  amenities.forEach(amenity => {
    html += `<li><strong>${amenity.charAt(0).toUpperCase() + amenity.slice(1)}</strong> - ${location.name} offers excellent ${amenity} options for residents.</li>`;
  });
  html += `</ul>`;
  return html;
}

// Helper: Generate tips section
function generateTipsSection(config, location) {
  const tips = [
    "Check water supply and storage capacity",
    "Verify landlord credentials and ownership documents",
    "Inspect security features like perimeter walls and CCTV",
    "Visit the property at different times of day",
    "Review the lease agreement carefully",
    "Consider proximity to schools, shopping, and transport",
    "Ask about service charges and maintenance fees",
    "Test water pressure and electrical systems"
  ];
  
  const shuffled = [...tips];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selectedTips = shuffled.slice(0, 5);
  
  let html = `<h2>Tips for Renting in ${location.name}</h2><ul>`;
  selectedTips.forEach(tip => {
    html += `<li><strong>${tip}:</strong> Always ${tip.toLowerCase()} before signing any agreement.</li>`;
  });
  html += `</ul>`;
  return html;
}

// Helper: Generate full blog content
function generateBlogContent(location, postType, postData = {}) {
  const config = blogConfig.locations[location];
  const year = new Date().getFullYear();
  const distance = location === 'kitengela' ? '30 kilometers' : 
                   location === 'ngong' ? '25 kilometers' :
                   location === 'ruiru' ? '20 kilometers' :
                   location === 'karen' ? '15 kilometers' :
                   location === 'kilimani' ? '5 kilometers' : '3 kilometers';
  
  const livingType = location === 'karen' || location === 'kilimani' ? 'luxury residential destination' :
                     location === 'ruiru' ? 'fast-growing satellite town' :
                     location === 'ngong' ? 'serene commuter hub' : 'vibrant residential hub';
  
  let content = '';
  
  // Introduction
  content += `<p>${location.name} has emerged as one of Nairobi's most sought-after ${livingType}, offering a perfect blend of ${randomItem(config.uniqueFeatures)}. Located just ${distance} from Nairobi's CBD, this vibrant community has transformed from a quiet outpost into a bustling residential hub.</p>`;
  
  content += `<p>With improved infrastructure and growing amenities, ${location.name} has become a prime choice for professionals, families, and investors seeking ${randomItem(['space', 'affordability', 'luxury', 'convenience'])}. In this comprehensive guide, we'll explore everything you need to know about renting in ${location.name} in ${year}.</p>`;
  
  // Why choose this location
  content += `<h2>Why ${location.name} is Nairobi's Premier ${livingType}</h2>`;
  content += `<p>${location.name}'s growth trajectory has been remarkable. What was once considered a distant outpost is now a fully-fledged urban center with modern infrastructure, shopping malls, schools, and healthcare facilities. The area's strategic location makes it ideal for those who value ${randomItem(['space', 'convenience', 'security', 'amenities'])} without compromising on quality of life.</p>`;
  
  // Rent prices
  content += `<h2>Average Rent Prices in ${location.name} (${year})</h2>`;
  content += generateRentTable(config, location);
  
  // Estates
  content += generateEstatesSection(config, location);
  
  // Security
  content += `<h2>Security in ${location.name}</h2>`;
  content += `<p>Security has improved significantly in ${location.name} over recent years. Most gated communities offer 24/7 security with controlled access, while standalone homes often feature electric fences, CCTV systems, and dedicated security guards. ${randomItem(config.estates)} and ${randomItem(config.estates)} are considered among the safest neighborhoods, with active community policing initiatives.</p>`;
  
  // Schools
  content += `<h2>Schools & Educational Institutions</h2>`;
  content += `<p>${location.name} boasts several top educational institutions, including international schools, private academies, and public institutions. Families moving to the area have access to quality education options for children of all ages.</p><ul>`;
  content += `<li><strong>${randomItem(['International School', 'Premier Academy', 'Elite School'])}</strong> - A leading institution offering quality education</li>`;
  content += `<li><strong>${randomItem(['Community School', 'Learning Centre', 'Education Hub'])}</strong> - Known for academic excellence</li>`;
  content += `<li><strong>Numerous public primary and secondary schools</strong> within the township</li></ul>`;
  
  // Amenities
  content += generateAmenitiesSection(config, location);
  
  // Commute
  content += `<h2>Commute to Nairobi</h2>`;
  content += `<p>With improved road networks and transport options, the commute from ${location.name} to Nairobi CBD now takes approximately ${config.commute}. Many residents use ${randomItem(['private vehicles', 'matatus', 'commuter trains', 'shuttles'])} for their daily commute.</p>`;
  
  // Tips
  content += generateTipsSection(config, location);
  
  // Future outlook
  content += `<h2>Future Development Outlook</h2>`;
  content += `<p>${location.name}'s growth shows no signs of slowing. With new residential projects, improved infrastructure, and ongoing commercial developments, the area continues to attract both homeowners and investors. Planned infrastructure improvements will further enhance connectivity, making ${location.name} an increasingly attractive option for Nairobi residents.</p>`;
  
  return content;
}

// Helper: Generate FAQ section HTML
function generateFAQSection(location) {
  const faqs = blogConfig.faqTemplates[location];
  if (!faqs || faqs.length === 0) return '';
  
  const year = new Date().getFullYear();
  
  let html = `<div class="faq-section">
    <h3 style="color: var(--gold); margin-bottom: 1.5rem;">Frequently Asked Questions</h3>`;
  
  faqs.forEach(faq => {
    const answer = faq.a.replace('{year}', year);
    html += `
      <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <div class="faq-question" itemprop="name">${faq.q}</div>
        <div itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
          <p>${answer}</p>
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  return html;
}

// Helper: Generate related posts
function generateRelatedPosts(currentSlug, location) {
  const allPosts = getAllPosts();
  const related = allPosts.filter(p => p.location === location && p.slug !== currentSlug).slice(0, 3);
  
  if (related.length === 0) return '';
  
  let html = `<div class="related-posts">
    <h3>You Might Also Like</h3>
    <div class="related-grid">`;
  
  related.forEach(post => {
    const image = blogConfig.locationImages[post.location]?.hero || `/images/blog/placeholder-${post.location}.jpg`;
    html += `
      <a href="/blog/${post.slug}.html" class="blog-card" style="text-decoration: none;">
        <img src="${image}" alt="${post.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 12px;">
        <div style="padding: 12px 0;">
          <h4 style="font-size: 14px; font-weight: 500;">${post.title.length > 50 ? post.title.substring(0, 50) + '...' : post.title}</h4>
          <p style="font-size: 11px; color: var(--text-muted);">${post.date}</p>
        </div>
      </a>
    `;
  });
  
  html += `</div></div>`;
  return html;
}

// Store all generated posts for cross-referencing
let generatedPosts = [];

function getAllPosts() {
  return generatedPosts;
}

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Generate a single blog post
function generateBlogPost(location, postType, index) {
  const config = blogConfig.locations[location];
  const year = new Date().getFullYear();
  const slug = `${location}-${postType}-${index}`;
  const locationName = config.name;
  const locationSlug = config.slug;
  
  // Generate title based on post type
  let title = '';
  switch(postType) {
    case 'guide':
      title = `The Ultimate Guide to Renting in ${config.name}: ${year} Edition`;
      break;
    case 'estate':
      const estate = randomItem(config.estates);
      title = `${estate}: The Premier Residential Area in ${config.name} You Need to Know`;
      break;
    case 'budget':
      const propertyTypes = Object.keys(config.rentRanges);
      const propType = randomItem(propertyTypes);
      const budget = Math.floor(config.rentRanges[propType][1] / 1000) * 1000;
      title = `Affordable ${propType.replace(/([A-Z])/g, ' $1').trim()} in ${config.name} Under ${budget.toLocaleString()}k`;
      break;
    case 'comparison':
      const estate1 = randomItem(config.estates);
      const estate2 = randomItem(config.estates.filter(e => e !== estate1));
      title = `${estate1} vs ${estate2}: Which ${config.name} Neighborhood Suits Your Lifestyle?`;
      break;
    default:
      title = `${config.name} Real Estate Guide: ${year} Edition`;
  }
  
  const description = `Discover everything you need to know about renting in ${config.name}. Complete guide to rent prices, best estates, security, schools, and amenities in ${year}.`;
  const keywords = `${config.baseKeywords.join(', ')}, ${config.name} rentals ${year}, ${config.name} real estate guide`;
  const image = blogConfig.locationImages[location]?.hero || `/images/blog/placeholder-${location}.jpg`;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const readTime = `${Math.floor(Math.random() * 10) + 5} min read`;
  const views = Math.floor(Math.random() * 5000) + 1000;
  
  // Generate content
  const content = generateBlogContent(location, postType, {});
  const faqContent = generateFAQSection(location);
  const relatedPosts = generateRelatedPosts(slug, location);
  
  // Get property recommendations (long-term)
  const longTermProperties = getPropertiesByLocation(locationName, 3);
  const propertyRecommendationsHtml = generatePropertyRecommendationsHTML(longTermProperties, locationName);
  
  // Get Airbnb recommendations (short-term)
  const airbnbProperties = getAirbnbPropertiesByLocation(locationName, 3);
  const airbnbRecommendationsHtml = generateAirbnbRecommendationsHTML(airbnbProperties, locationName);
  
  // Replace template placeholders
  let html = template
    .replace(/{{title}}/g, title)
    .replace(/{{meta_description}}/g, description)
    .replace(/{{keywords}}/g, keywords)
    .replace(/{{image}}/g, image)
    .replace(/{{slug}}/g, slug)
    .replace(/{{category}}/g, config.name.toUpperCase())
    .replace(/{{category_name}}/g, locationName)
    .replace(/{{category_slug}}/g, locationSlug)
    .replace(/{{date}}/g, date)
    .replace(/{{readTime}}/g, readTime)
    .replace(/{{views}}/g, views)
    .replace(/{{content}}/g, content)
    .replace(/{{faq_content}}/g, faqContent)
    .replace(/{{related_posts}}/g, relatedPosts)
    .replace(/{{property_recommendations}}/g, propertyRecommendationsHtml)
    .replace(/{{airbnb_recommendations}}/g, airbnbRecommendationsHtml);
  
  // Save the file
  const outputPath = path.join(BLOG_DIR, `${slug}.html`);
  fs.writeFileSync(outputPath, html);
  
  // Store for cross-referencing
  generatedPosts.push({
    id: generatedPosts.length + 1,
    slug: slug,
    title: title,
    excerpt: description.substring(0, 120) + '...',
    category: location,
    image: image,
    date: date,
    readTime: readTime,
    views: views,
    location: location,
    postType: postType
  });
  
  console.log(`✅ Generated: /blog/${slug}.html (${longTermProperties.length} long-term, ${airbnbProperties.length} Airbnb)`);
  return { slug, title };
}

// Generate posts.json for the blog listing page
function generatePostsJson() {
  const postsForJson = generatedPosts.map(post => ({
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    image: post.image,
    date: post.date,
    readTime: post.readTime,
    views: post.views,
    slug: post.slug
  }));
  
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const outputPath = path.join(dataDir, 'posts.json');
  fs.writeFileSync(outputPath, JSON.stringify(postsForJson, null, 2));
  console.log(`✅ Generated posts.json with ${postsForJson.length} posts`);
}

// Generate all blog posts
async function generateAllPosts() {
  console.log('🚀 Starting blog post generation with Airbnb recommendations...\n');
  
  const locations = Object.keys(blogConfig.locations);
  const postTypes = ['guide', 'estate', 'budget', 'comparison'];
  
  // Generate posts per location - adjust for desired total
  const postsPerLocation = 170; // 6 locations × 170 = 1020 posts (adjust to 170 for now, change to 170 for 1000+)
  
  console.log(`📊 Will generate ${postsPerLocation} posts per location (${locations.length} locations) = ${postsPerLocation * locations.length} total posts\n`);
  console.log(`📊 Airbnb recommendations will be pulled from properties.json\n`);
  
  for (const location of locations) {
    console.log(`\n📝 Generating ${postsPerLocation} posts for ${location.toUpperCase()}...`);
    
    for (let i = 1; i <= postsPerLocation; i++) {
      const postType = randomItem(postTypes);
      generateBlogPost(location, postType, i);
    }
    console.log(`   ✓ Completed ${postsPerLocation} posts for ${location}`);
  }
  
  console.log(`\n✅ Generated ${generatedPosts.length} blog posts!`);
  
  // Generate posts.json for the blog listing page
  generatePostsJson();
  
  console.log('\n🎉 Blog generation complete!');
  console.log(`   📁 Blog posts saved to: /blog/`);
  console.log(`   📄 Posts index saved to: /data/posts.json`);
  console.log(`   🔗 Visit your blog at: /blog.html`);
  console.log(`\n   💡 Each blog post now includes:`);
  console.log(`      🏠 Long-term property recommendations (from properties.json)`);
  console.log(`      ✨ Short-stay/Airbnb recommendations (from properties.json)`);
}

// Run the generator
generateAllPosts().catch(console.error);