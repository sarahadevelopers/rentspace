// generate-location-pages.js
// Generates individual location pages for each area

const fs = require('fs');
const path = require('path');

const LOCATION_DIR = path.join(__dirname, 'location');
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'location-template.html');
const PROPERTIES_PATH = path.join(__dirname, 'data', 'properties.json');

// Location data configuration
const locations = {
  kitengela: {
    name: "Kitengela",
    slug: "kitengela",
    description: "Experience affordable luxury in Kitengela, Nairobi's fastest-growing satellite town. Spacious homes, modern amenities, and easy access via the Nairobi Expressway.",
    avg_rent: "KES 35,000",
    commute_time: "45-60 min",
    estate_count: 8,
    estates: ["Acacia", "Milimani", "Yukos", "Chuna", "Muigai", "Noonkopir", "New Valley", "Royal Finesse"],
    image: "/images/locations/kitengela-hero.jpg"
  },
  ngong: {
    name: "Ngong",
    slug: "ngong",
    description: "Discover serene living with breathtaking Ngong Hills views. Perfect for those seeking tranquility while staying connected to Nairobi.",
    avg_rent: "KES 45,000",
    commute_time: "45-60 min",
    estate_count: 7,
    estates: ["Ngong Vet", "Matasia", "Kibiko", "Ngong View", "Kerarapon", "Juanco", "Zambia"],
    image: "/images/locations/ngong-hero.jpg"
  },
  ruiru: {
    name: "Ruiru",
    slug: "ruiru",
    description: "Fast-growing urban hub with excellent connectivity via Thika Superhighway. Modern apartments and spacious homes for families and professionals.",
    avg_rent: "KES 40,000",
    commute_time: "30-45 min",
    estate_count: 7,
    estates: ["Kamakis", "Membley", "Tatu City", "Kimbo", "Gwa Kairu", "Kahawa Sukari", "Mwihoko"],
    image: "/images/locations/ruiru-hero.jpg"
  },
  karen: {
    name: "Karen",
    slug: "karen",
    description: "Nairobi's most prestigious leafy suburb. Luxury villas, ambassadorial homes, and exclusive gated communities with unparalleled privacy.",
    avg_rent: "KES 180,000",
    commute_time: "30-45 min",
    estate_count: 7,
    estates: ["Miotoni", "Hardy", "Bogani", "Windy Ridge", "Karen Plains", "Kerarapon", "Rhino Park"],
    image: "/images/locations/karen-hero.jpg"
  },
  kilimani: {
    name: "Kilimani",
    slug: "kilimani",
    description: "Urban luxury at its finest. Modern apartments, penthouses, and vibrant city living with world-class amenities and dining.",
    avg_rent: "KES 85,000",
    commute_time: "10-15 min",
    estate_count: 6,
    estates: ["Yaya Centre", "Argwings Kodhek", "Dennis Pritt", "Lenana Road", "Kindaruma Road", "Muringa Road"],
    image: "/images/locations/kilimani-hero.jpg"
  },
  hurlingham: {
    name: "Hurlingham",
    slug: "hurlingham",
    description: "Prime location for professionals. Mix of residential and commercial properties with proximity to CBD, Upper Hill, and Yaya Centre.",
    avg_rent: "KES 70,000",
    commute_time: "5-10 min",
    estate_count: 6,
    estates: ["Argwings Kodhek", "Timau Road", "Rose Avenue", "Ralph Bunche", "Cotton Avenue", "Hurlingham Court"],
    image: "/images/locations/hurlingham-hero.jpg"
  }
};

// Ensure location directory exists
if (!fs.existsSync(LOCATION_DIR)) {
  fs.mkdirSync(LOCATION_DIR, { recursive: true });
}

// Read template
let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Count properties per location
function getPropertyCount(locationSlug) {
  try {
    const properties = JSON.parse(fs.readFileSync(PROPERTIES_PATH, 'utf8'));
    return properties.filter(p => 
      p.estate?.toLowerCase() === locationSlug.toLowerCase() ||
      p.estate?.toLowerCase() === locations[locationSlug]?.name?.toLowerCase()
    ).length;
  } catch (error) {
    console.error('Error reading properties:', error);
    return 0;
  }
}

// Generate estate links HTML
function generateEstateLinks(estates, locationSlug) {
  return estates.map(estate => `
    <a href="/rentals.html?estate=${encodeURIComponent(estate)}" class="estate-link">${estate}</a>
  `).join('');
}

// Generate each location page
Object.entries(locations).forEach(([slug, location]) => {
  const propertyCount = getPropertyCount(slug);
  const estateLinks = generateEstateLinks(location.estates, slug);
  
  let html = template
    .replace(/{{location_name}}/g, location.name)
    .replace(/{{location_slug}}/g, location.slug)
    .replace(/{{location_description}}/g, location.description)
    .replace(/{{property_count}}/g, propertyCount)
    .replace(/{{avg_rent}}/g, location.avg_rent)
    .replace(/{{commute_time}}/g, location.commute_time)
    .replace(/{{estate_count}}/g, location.estate_count)
    .replace(/{{estate_links}}/g, estateLinks);
  
  const outputPath = path.join(LOCATION_DIR, `${slug}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`✅ Generated: /location/${slug}.html (${propertyCount} properties)`);
});

console.log('\n🎉 Location pages generated successfully!');
console.log('   📁 Location pages saved to: /location/');
console.log('   🔗 Visit: /location/kitengela.html, /location/ngong.html, etc.');