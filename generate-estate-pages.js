const fs = require('fs');
const path = require('path');

// ========== ESTATE DATA (static fallback) ==========
const estates = [
  // Kitengela Estates
  { name: "Acacia", slug: "acacia", location: "Kitengela", locationSlug: "kitengela", type: "gated community", minRent: "20,000", maxRent: "60,000", security: "24/7 guards, electric fence, CCTV", water: "Borehole + city water backup", roads: "Paved roads within estate", schools: "Acacia Crest Academy, Kitengela International School", hospitals: "Halisi Family Hospital, Kitengela Nursing Home", malls: "Kitengela Mall, Signature Mall", keyFeature: "quiet family living, spacious plots" },
  { name: "Milimani", slug: "milimani", location: "Kitengela", locationSlug: "kitengela", type: "established residential estate", minRent: "25,000", maxRent: "80,000", security: "24/7 guards, gated sub‑sections", water: "City water + borehole", roads: "Mostly paved", schools: "Milimani Academy, Kitengela International", hospitals: "Halisi Family Hospital", malls: "Milimani Shopping Centre", keyFeature: "central location, close to town" },
  { name: "Chuna", slug: "chuna", location: "Kitengela", locationSlug: "kitengela", type: "gated community", minRent: "25,000", maxRent: "85,000", security: "24/7 guards, electric fence", water: "Borehole reliable", roads: "Paved", schools: "Acacia Crest, Kitengela International", hospitals: "Halisi Family Hospital", malls: "Kitengela Mall (5 min)", keyFeature: "spacious bungalows, family‑friendly" },
  { name: "Yukos", slug: "yukos", location: "Kitengela", locationSlug: "kitengela", type: "mixed residential", minRent: "15,000", maxRent: "50,000", security: "Community policing, some gated sections", water: "City water", roads: "Murram and paved mix", schools: "Yukos Academy, Kitengela International", hospitals: "Kitengela Nursing Home", malls: "Kitengela Mall", keyFeature: "affordable options, close to town" },
  { name: "Muigai", slug: "muigai", location: "Kitengela", locationSlug: "kitengela", type: "emerging estate", minRent: "12,000", maxRent: "40,000", security: "Neighbourhood watch, some gated pockets", water: "City water + tanker delivery", roads: "Developing", schools: "Muigai Primary, Kitengela International", hospitals: "Halisi Family Hospital", malls: "Kitengela Mall", keyFeature: "affordable, good for young families" },
  { name: "Noonkopir", slug: "noonkopir", location: "Kitengela", locationSlug: "kitengela", type: "gated community", minRent: "30,000", maxRent: "90,000", security: "24/7 guards, electric fence", water: "Borehole", roads: "Paved", schools: "Noonkopir School, Kitengela International", hospitals: "Halisi Family Hospital", malls: "Signature Mall", keyFeature: "quiet, upscale, near Athi River road" },
  { name: "New Valley", slug: "new-valley", location: "Kitengela", locationSlug: "kitengela", type: "modern estate", minRent: "18,000", maxRent: "55,000", security: "Gated with guards", water: "Borehole", roads: "Paved", schools: "New Valley Academy, Kitengela International", hospitals: "Kitengela Nursing Home", malls: "Kitengela Mall", keyFeature: "newer development, modern houses" },
  { name: "Royal Finesse", slug: "royal-finesse", location: "Kitengela", locationSlug: "kitengela", type: "luxury gated community", minRent: "50,000", maxRent: "150,000", security: "High‑end 24/7 security, patrols", water: "Borehole with backup", roads: "Excellent paved roads", schools: "Kitengela International, Acacia Crest", hospitals: "Halisi Family Hospital", malls: "Signature Mall, Kitengela Mall", keyFeature: "luxury villas, high privacy" },
  // Syokimau Estates
  { name: "Katani", slug: "katani", location: "Syokimau", locationSlug: "syokimau", type: "gated community", minRent: "20,000", maxRent: "60,000", security: "24/7 guards, electric fence", water: "Borehole + city water", roads: "Paved", schools: "Syokimau Primary, St. Bakhita", hospitals: "Syokimau Medical Centre", malls: "Gateway Mall, Signature Mall", keyFeature: "quiet, family‑friendly, near JKIA" },
  { name: "Greatwall", slug: "greatwall", location: "Syokimau", locationSlug: "syokimau", type: "gated community", minRent: "25,000", maxRent: "80,000", security: "24/7 guards, CCTV", water: "Borehole", roads: "Paved", schools: "Syokimau International, BrentCare", hospitals: "Syokimau Medical Centre", malls: "Gateway Mall", keyFeature: "spacious apartments, near SGR" },
  { name: "Gateway", slug: "gateway", location: "Syokimau", locationSlug: "syokimau", type: "mixed‑use estate", minRent: "18,000", maxRent: "55,000", security: "Gated with guards", water: "City water", roads: "Paved", schools: "Gateway School, Syokimau Primary", hospitals: "Gateway Clinic", malls: "Gateway Mall (inside)", keyFeature: "convenient, near shops and transport" },
  { name: "Syokimau View", slug: "view", location: "Syokimau", locationSlug: "syokimau", type: "apartment estate", minRent: "22,000", maxRent: "50,000", security: "24/7 guards", water: "City water + borehole", roads: "Paved", schools: "Syokimau International, BrentCare", hospitals: "Syokimau Medical Centre", malls: "Gateway Mall", keyFeature: "affordable apartments, great views" }
];

// ========== TEMPLATE ==========
const templatePath = path.join(__dirname, 'templates', 'estate-template.html');
let template = fs.readFileSync(templatePath, 'utf8');

// Create estate folder if it doesn't exist
const estateDir = path.join(__dirname, 'estate');
if (!fs.existsSync(estateDir)) {
  fs.mkdirSync(estateDir);
  console.log('📁 Created /estate folder');
}

// ========== LOAD FULL ESTATES DATA FOR SIMILARITY ==========
let allEstatesData = [];
try {
  allEstatesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'estates.json'), 'utf8'));
} catch (err) {
  console.warn('⚠️ Could not load data/estates.json, similarity will be based on internal estate list');
  // Fallback: build from the estates array (but missing type mapping)
  allEstatesData = estates.map(e => ({
    name: e.name,
    slug: e.slug,
    location: e.location,
    locationSlug: e.locationSlug,
    type: e.type,
    priceRange: "mid",
    familyFriendly: true
  }));
}

// ========== HELPER: generate rent table rows ==========
function generateRentRows(estate) {
  const minNum = parseInt(estate.minRent.replace(/,/g, ''));
  const maxNum = parseInt(estate.maxRent.replace(/,/g, ''));
  let rows = `<tr><th>Bedsitter</th><td>${Math.round(minNum * 0.4).toLocaleString()} - ${Math.round(minNum * 0.6).toLocaleString()}</td></tr>`;
  rows += `<tr><th>2 Bedroom</th><td>${Math.round(minNum * 0.8).toLocaleString()} - ${Math.round(maxNum * 0.4).toLocaleString()}</tr></tr>`;
  rows += `<tr><th>3 Bedroom</th><td>${Math.round(minNum).toLocaleString()} - ${Math.round(maxNum * 0.7).toLocaleString()}</td></tr>`;
  rows += `<tr><th>Bungalow (3-4 bed)</th><td>${Math.round(maxNum * 0.6).toLocaleString()} - ${Math.round(maxNum * 0.9).toLocaleString()}</td></tr>`;
  rows += `<tr><th>Maisonette / Luxury</th><td>${Math.round(maxNum * 0.9).toLocaleString()} - ${Math.round(maxNum * 1.2).toLocaleString()}+</td></tr>`;
  return rows;
}

// ========== HELPER: generate FAQ items ==========
function generateFaqItems(estate) {
  return `
    <div class="faq-item">
      <h3>Is ${estate.name} Estate safe?</h3>
      <p>Yes, ${estate.name} Estate has ${estate.security}.</p>
    </div>
    <div class="faq-item">
      <h3>How much is rent in ${estate.name} Estate?</h3>
      <p>Rent ranges from KES ${estate.minRent} to ${estate.maxRent} per month depending on property type.</p>
    </div>
    <div class="faq-item">
      <h3>Is ${estate.name} good for families?</h3>
      <p>Yes, with nearby schools like ${estate.schools.split(',')[0]} and a ${estate.keyFeature.toLowerCase()} environment.</p>
    </div>
    <div class="faq-item">
      <h3>How far is ${estate.name} from Nairobi?</h3>
      <p>About 45‑60 minutes from Nairobi CBD via the Expressway or Namanga Road.</p>
    </div>
    <div class="faq-item">
      <h3>Does ${estate.name} have reliable water?</h3>
      <p>${estate.water} ensures consistent supply.</p>
    </div>
  `;
}

// ========== HELPER: generate the property filter script ==========
function generateFilterScript(estateName) {
  return `
  <script>
    const basePath = window.location.hostname === 'sarahadevelopers.github.io' ? '/rentspace' : '';
    const estateName = '${estateName.replace(/'/g, "\\'")}';
    
    fetch(basePath + '/data/properties.json')
      .then(r => r.json())
      .then(properties => {
        const filtered = properties.filter(p => p.specific_estate?.toLowerCase() === estateName.toLowerCase());
        const grid = document.getElementById('estate-properties');
        if (!grid) return;
        if (filtered.length === 0) {
          grid.innerHTML = '<p>No active listings in this estate right now. <a href="/contact.html">Contact us</a> to find similar homes.</p>';
          return;
        }
        grid.innerHTML = filtered.map(prop => \`
          <a href="/property/\${prop.slug}.html" class="property-card">
            <img src="\${prop.images?.[0] || '/images/placeholder.jpg'}" style="width:100%; height:180px; object-fit:cover;">
            <div style="padding:1rem;">
              <h3>\${prop.title}</h3>
              <div>KES \${prop.price.toLocaleString()}/mo</div>
              <div>\${prop.specs?.bedrooms || 0} bed • \${prop.specs?.bathrooms || 0} bath</div>
            </div>
          </a>
        \`).join('');
      })
      .catch(err => {
        console.error('Error loading properties:', err);
        const grid = document.getElementById('estate-properties');
        if (grid) grid.innerHTML = '<p>Unable to load properties. Please try again later.</p>';
      });
  </script>
  `;
}

// ========== SIMILAR ESTATES HELPERS ==========
function getSimilarEstates(currentEstate, allEstates, limit = 4) {
  return allEstates
    .filter(e => e.name !== currentEstate.name)
    .map(e => {
      let score = 0;
      if (e.location === currentEstate.location) score += 2;
      if (e.type === currentEstate.type) score += 1;
      return { ...e, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function renderSimilarEstates(similar) {
  if (!similar.length) return '';
  let html = '<h2>🏘️ Similar Estates Near You</h2><div class="similar-estates-grid">';
  similar.forEach(e => {
    html += `<a href="/estate/${e.locationSlug}-${e.slug}.html" class="similar-card">${e.name} Estate, ${e.location}</a>`;
  });
  html += '</div>';
  return html;
}

// ========== GENERATE EACH ESTATE PAGE ==========
estates.forEach(estate => {
  // Replace content placeholders
  let output = template
    .replace(/{{estate_name}}/g, estate.name)
    .replace(/{{estate_slug}}/g, estate.slug)
    .replace(/{{location_name}}/g, estate.location)
    .replace(/{{location_slug}}/g, estate.locationSlug)
    .replace(/{{estate_type}}/g, estate.type)
    .replace(/{{min_rent}}/g, estate.minRent)
    .replace(/{{max_rent}}/g, estate.maxRent)
    .replace(/{{security_level}}/g, estate.security)
    .replace(/{{water_supply}}/g, estate.water)
    .replace(/{{roads_condition}}/g, estate.roads)
    .replace(/{{nearby_schools}}/g, estate.schools)
    .replace(/{{nearby_hospitals}}/g, estate.hospitals)
    .replace(/{{nearby_malls}}/g, estate.malls)
    .replace(/{{estate_key_feature}}/g, estate.keyFeature)
    .replace(/{{rent_rows}}/g, generateRentRows(estate))
    .replace(/{{faq_items}}/g, generateFaqItems(estate))
    .replace(/{{estate_description}}/g, `${estate.name} is a ${estate.type} in ${estate.location} known for ${estate.keyFeature}.`);

  // Inject the property filter script
  output = output.replace('<!-- INJECT_SCRIPT -->', generateFilterScript(estate.name));

  // Inject similar estates (needs {{similar_estates}} in template)
  const similar = getSimilarEstates(estate, allEstatesData, 4);
  output = output.replace('{{similar_estates}}', renderSimilarEstates(similar));

  const filePath = path.join(estateDir, `${estate.locationSlug}-${estate.slug}.html`);
  fs.writeFileSync(filePath, output);
  console.log(`✅ Generated: /estate/${estate.locationSlug}-${estate.slug}.html`);
});

console.log(`\n🎉 Done! Generated ${estates.length} estate pages.`);