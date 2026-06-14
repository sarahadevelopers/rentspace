// generate-location-pages.js
const fs = require('fs');
const path = require('path');

const LOCATION_DIR = path.join(__dirname, 'location');
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'location-template.html');
const PROPERTIES_PATH = path.join(__dirname, 'data', 'properties.json');
const LOCATIONS_DATA_PATH = path.join(__dirname, 'data', 'locations.json');

// Read locations data (long_content, faq_html, etc.)
const locationsData = JSON.parse(fs.readFileSync(LOCATIONS_DATA_PATH, 'utf8'));

// Ensure location directory exists
if (!fs.existsSync(LOCATION_DIR)) {
  fs.mkdirSync(LOCATION_DIR, { recursive: true });
}

// Read template
let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Count properties per location
function getPropertyCount(locationSlug, locationName) {
  try {
    const properties = JSON.parse(fs.readFileSync(PROPERTIES_PATH, 'utf8'));
    return properties.filter(p => 
      p.estate?.toLowerCase() === locationSlug.toLowerCase() ||
      p.estate?.toLowerCase() === locationName.toLowerCase()
    ).length;
  } catch (error) {
    console.error('Error reading properties:', error);
    return 0;
  }
}

// Generate estate links HTML
function generateEstateLinks(estates) {
  if (!estates || !estates.length) return '';
  return estates.map(estate => `
    <a href="/rentals.html?estate=${encodeURIComponent(estate)}" class="estate-link">${estate}</a>
  `).join('');
}

// Generate nearby locations HTML (excludes current location)
function generateNearbyLinks(currentSlug, nearbySlugs) {
  if (!nearbySlugs || !nearbySlugs.length) return '';
  return nearbySlugs
    .filter(slug => slug !== currentSlug) // just in case, though JSON shouldn't include self
    .map(slug => {
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      return `<li><a href="../location/${slug}.html">${name}</a></li>`;
    }).join('');
}

// Generate each location page
Object.entries(locationsData).forEach(([slug, location]) => {
  const propertyCount = getPropertyCount(slug, location.name);
  const estateLinks = generateEstateLinks(location.estates);
  const nearbyLinks = generateNearbyLinks(slug, location.nearby || []);
  
  let html = template
    .replace(/{{location_name}}/g, location.name)
    .replace(/{{location_slug}}/g, slug)
    .replace(/{{location_description}}/g, location.description)
    .replace(/{{property_count}}/g, propertyCount)
    .replace(/{{avg_rent}}/g, location.avg_rent)
    .replace(/{{commute_time}}/g, location.commute_time)
    .replace(/{{estate_count}}/g, location.estate_count)
    .replace(/{{estate_links}}/g, estateLinks)
    .replace(/{{long_content}}/g, location.long_content || '')
    .replace(/{{faq_html}}/g, location.faq_html || '')
    .replace(/{{nearby_locations_html}}/g, nearbyLinks);
  
  const outputPath = path.join(LOCATION_DIR, `${slug}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`✅ Generated: /location/${slug}.html (${propertyCount} properties)`);
});

console.log('\n🎉 Location pages generated successfully!');
console.log('   📁 Location pages saved to: /location/');