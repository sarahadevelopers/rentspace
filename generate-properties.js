const fs = require('fs');
const path = require('path');

const estates = {
  highEnd: ['Karen', 'Kilimani', 'Hurlingham'],
  midRange: ['Syokimau', 'Ngong', 'Kitengela']
};

const propertyTypes = {
  Bedsitter: { high: [25000, 45000], mid: [8000, 15000], display: 'Studio' },
  '1 Bedroom': { high: [50000, 90000], mid: [18000, 30000], display: '1 Bedroom' },
  '2 Bedroom': { high: [80000, 150000], mid: [35000, 55000], display: '2 Bedroom' },
  '3 Bedroom': { high: [120000, 250000], mid: [50000, 75000], display: '3 Bedroom' },
  Bungalow: { high: [180000, 350000], mid: [45000, 90000], display: 'Bungalow' },
  Mansionette: { high: [250000, 500000], mid: [80000, 120000], display: 'Mansionette' }
};

const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getEstate = (type, isHighEnd) => {
  const pool = isHighEnd ? estates.highEnd : estates.midRange;
  return pool[Math.floor(Math.random() * pool.length)];
};

const getPriceRange = (type, isHighEnd) => {
  const range = propertyTypes[type][isHighEnd ? 'high' : 'mid'];
  return getRandom(range[0], range[1]);
};

const getFeatures = (type, estate) => {
  const base = ['Tiled Floors', 'Water Heater', 'Secure Parking'];
  if (estate === 'Karen' || estate === 'Kilimani' || estate === 'Hurlingham') {
    if (type === 'Bungalow' || type === 'Mansionette') {
      base.push('DSQ', 'Private Garden', 'Borehole', 'Solar Panels', 'Electric Fence');
    } else {
      base.push('Gym', 'Swimming Pool', 'Backup Generator', 'Rooftop Terrace');
    }
  } else {
    if (type === 'Bungalow') {
      base.push('DSQ', 'Compound Wall', 'Parking');
    } else {
      base.push('Intercom', 'Common Area Backup');
    }
  }
  return base.slice(0, 5);
};

const getSpecs = (type) => {
  const bedrooms = type === 'Bedsitter' ? 0 : parseInt(type.split(' ')[0]) || 3;
  const bathrooms = type === 'Bedsitter' ? 1 : bedrooms === 1 ? 1 : bedrooms === 2 ? 2 : bedrooms === 3 ? 2 : 3;
  const parking = type === 'Bedsitter' ? 0 : bedrooms <= 2 ? 1 : 2;
  const sqft = type === 'Bedsitter' ? 350 : bedrooms === 1 ? 550 : bedrooms === 2 ? 850 : bedrooms === 3 ? 1200 : 1800;
  return { bedrooms, bathrooms, parking, sqft };
};

// Clean slug generator - no confusion!
const generateCleanSlug = (type, estate, id) => {
  // Get clean bedroom number
  let bedroomText = '';
  if (type === 'Bedsitter') {
    bedroomText = 'studio';
  } else if (type === '1 Bedroom') {
    bedroomText = '1-bedroom';
  } else if (type === '2 Bedroom') {
    bedroomText = '2-bedroom';
  } else if (type === '3 Bedroom') {
    bedroomText = '3-bedroom';
  } else if (type === 'Bungalow') {
    bedroomText = `${getSpecs(type).bedrooms}-bedroom`;
  } else if (type === 'Mansionette') {
    bedroomText = `${getSpecs(type).bedrooms}-bedroom`;
  }
  
  // Get property type for slug
  let propertyTypeText = '';
  if (type === 'Bungalow') {
    propertyTypeText = 'bungalow';
  } else if (type === 'Mansionette') {
    propertyTypeText = 'mansionette';
  } else {
    propertyTypeText = 'apartment';
  }
  
  // Clean estate name
  const cleanEstate = estate.toLowerCase();
  
  // Generate clean slug
  return `${bedroomText}-${propertyTypeText}-in-${cleanEstate}-${id}`;
};

// Clean title generator
const generateCleanTitle = (type, estate, specs) => {
  let bedroomText = '';
  if (type === 'Bedsitter') {
    bedroomText = 'Studio';
  } else if (type === '1 Bedroom') {
    bedroomText = '1 Bedroom';
  } else if (type === '2 Bedroom') {
    bedroomText = '2 Bedroom';
  } else if (type === '3 Bedroom') {
    bedroomText = '3 Bedroom';
  } else if (type === 'Bungalow') {
    return `Spacious ${specs.bedrooms} Bedroom Bungalow in ${estate}`;
  } else if (type === 'Mansionette') {
    return `Luxury ${specs.bedrooms} Bedroom Mansionette in ${estate}`;
  }
  
  let propertyTypeText = '';
  if (type === 'Bungalow' || type === 'Mansionette') {
    propertyTypeText = type;
  } else {
    propertyTypeText = 'Apartment';
  }
  
  return `${bedroomText} ${propertyTypeText} in ${estate}`;
};

// Generate image URL based on property type
const generateImageUrl = (type, estate, id) => {
  const typeKey = type.toLowerCase().replace(' ', '-');
  // You can replace with actual image paths later
  return `/images/properties/${typeKey}-${estate.toLowerCase()}-${id}.jpg`;
};

const properties = [];
const totalProperties = 100; // ✅ 100 properties for production!

console.log('🏠 Generating 100 properties for RentSpace...\n');

for (let i = 1; i <= totalProperties; i++) {
  const isHighEnd = Math.random() > 0.5;
  const types = Object.keys(propertyTypes);
  const type = types[Math.floor(Math.random() * types.length)];
  const estate = getEstate(type, isHighEnd);
  const price = getPriceRange(type, isHighEnd);
  const specs = getSpecs(type);
  const features = getFeatures(type, estate);
  const title = generateCleanTitle(type, estate, specs);
  const slug = generateCleanSlug(type, estate, i);
  const imageUrl = generateImageUrl(type, estate, i);
  
  properties.push({
    id: i,
    slug,
    title,
    type,
    estate,
    price,
    currency: 'KES',
    specs,
    features,
    images: [imageUrl],
    isFeatured: i <= 10,
    movingEstimate: Math.floor(price * 0.1),
    fumigationLink: 'https://your-fumigation-site.com',
    description: `Experience luxury living in this beautiful ${title.toLowerCase()}. Located in the prestigious ${estate} neighborhood, this property offers ${specs.bedrooms} bedrooms, ${specs.bathrooms} bathrooms, and ${specs.parking} parking spaces. Features include ${features.slice(0, 3).join(', ')}.`
  });
  
  // Show progress every 10 properties
  if (i % 10 === 0) {
    console.log(`   ✓ Generated ${i}/${totalProperties} properties...`);
  }
}

// Ensure the data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Write to data/properties.json
const outputPath = path.join(dataDir, 'properties.json');
fs.writeFileSync(outputPath, JSON.stringify(properties, null, 2));
console.log(`\n✅ Successfully generated ${properties.length} properties in ${outputPath}`);

// Show sample slugs for verification
console.log('\n📝 Sample slugs (first 10):');
properties.slice(0, 10).forEach(p => {
  console.log(`   ${p.slug.padEnd(45)} → ${p.title}`);
});

console.log('\n📊 Property Distribution by Estate:');
const estateCount = {};
properties.forEach(p => {
  estateCount[p.estate] = (estateCount[p.estate] || 0) + 1;
});
Object.entries(estateCount).forEach(([estate, count]) => {
  const percentage = ((count / 100) * 100).toFixed(1);
  console.log(`   ${estate.padEnd(12)}: ${count} properties (${percentage}%)`);
});

console.log('\n📊 Property Type Distribution:');
const typeCount = {};
properties.forEach(p => {
  typeCount[p.type] = (typeCount[p.type] || 0) + 1;
});
Object.entries(typeCount).forEach(([type, count]) => {
  const percentage = ((count / 100) * 100).toFixed(1);
  console.log(`   ${type.padEnd(12)}: ${count} properties (${percentage}%)`);
});

console.log('\n🎉 Ready for production! Run "node generate-pages.js" to create HTML files.');