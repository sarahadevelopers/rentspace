// export-from-db.js
// Exports all approved properties from MongoDB into data/properties.json
// in the format that generate-all.js expects.

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Property = require('./models/Property');

// Helper: map MongoDB field names → properties.json field names
function transform(prop) {
    return {
        id: prop._id.toString(),
        slug: prop.slug,
        title: prop.title,
        type: prop.propertyType || 'Property',
        estate: prop.estate || 'Nairobi',
        specific_estate: prop.specificEstate || prop.specific_estate || '',
        price: prop.price,
        currency: 'KES',
        specs: {
            bedrooms: prop.bedrooms || 0,
            bathrooms: prop.bathrooms || 0,
            parking: prop.parking || 0,
            sqft: prop.sqft || 0
        },
        features: prop.amenities || [],
        images: prop.images || [],
        isFeatured: prop.featured || false,
        movingEstimate: prop.movingEstimate || 0,
        fumigationLink: prop.fumigationLink || 'https://fumigo.co.ke',
        description: prop.description || '',
        rental_type: prop.rental_type || prop.listingType || '',
        available_for: prop.available_for || prop.listingType || '',
        is_airbnb_ready: prop.isAirbnb || prop.listingType === 'short_term',
        price_night: prop.priceNight || null,
        price_week: null,
        price_month_short: null,
        min_stay_nights: null,
        airbnb_rating: prop.airbnb_rating || null,
        airbnb_reviews: prop.airbnb_reviews || null,
        airbnb_superhost: false,
        furnishing_level: prop.furnishing || 'partially_furnished',
        is_furnished: (prop.furnishing === 'fully_furnished') || false,
        short_stay_amenities: prop.amenities || [],
        meta_description: (prop.description || '').substring(0, 160),
        why_rent: prop.why_rent || '',
        listingType: prop.listingType,
        ownerSubscriptionPlan: prop.ownerSubscriptionPlan || 'free',
        status: prop.status,
        createdAt: prop.createdAt,
        updatedAt: prop.updatedAt
    };
}

async function exportAll() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not found in .env');
        process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected');

    const properties = await Property.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .lean();

    console.log(`📊 Found ${properties.length} approved properties`);

    const transformed = properties.map(transform);

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

    const outputPath = path.join(dataDir, 'properties.json');
    fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2), 'utf-8');

    console.log(`✅ Wrote ${transformed.length} properties to ${outputPath}`);
    await mongoose.disconnect();
    process.exit(0);
}

exportAll().catch(err => {
    console.error('❌ Export failed:', err);
    process.exit(1);
});