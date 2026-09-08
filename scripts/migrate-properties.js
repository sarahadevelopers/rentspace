// scripts/migrate-properties.js
// Run with: node scripts/migrate-properties.js

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Property = require('../models/Property');
const User = require('../models/User');

// ─── Helper: generate unique slug ──────────────────────────────
async function generateUniqueSlug(title, existingId = null) {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!baseSlug) baseSlug = 'property';

  let slug = baseSlug;
  let counter = 1;
  let existing = await Property.findOne({ slug, _id: { $ne: existingId } });
  while (existing) {
    slug = `${baseSlug}-${counter}`;
    existing = await Property.findOne({ slug, _id: { $ne: existingId } });
    counter++;
  }
  return slug;
}

// ─── Connect to MongoDB ──────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await migrateProperties();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function migrateProperties() {
  try {
    // ── 1. Get or create admin user ──────────────────────────────
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('⚠️ No admin user found. Creating one...');
      adminUser = await User.create({
        name: 'Admin',
        email: 'admin@rentspace.co.ke',
        phone: '254700000000',
        password: 'Admin123!',
        role: 'admin',
        verified: true
      });
      console.log(`✅ Admin user created with ID: ${adminUser._id}`);
    } else {
      console.log(`✅ Using existing admin user: ${adminUser.email}`);
    }

    // ── 2. Read properties.json ──────────────────────────────────
    const jsonPath = path.join(__dirname, '..', 'data', 'properties.json');
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ properties.json not found at:', jsonPath);
      return;
    }
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const properties = JSON.parse(rawData);

    console.log(`📄 Found ${properties.length} properties in JSON.`);

    let imported = 0;
    let skipped = 0;

    // ── 3. Loop through each property ────────────────────────────
    for (const oldProp of properties) {
      const title = oldProp.title || 'Untitled';

      // ── Determine listingType from title or transaction ──────
      let listingType = 'sale';
      const lowerTitle = title.toLowerCase();
      const hasRentKeyword = lowerTitle.includes('to let') || lowerTitle.includes('for rent') || lowerTitle.includes('rent') || lowerTitle.includes('airbnb') || lowerTitle.includes('short stay');
      
      if (oldProp.transaction) {
        const trans = oldProp.transaction.toLowerCase();
        if (trans === 'rent' || trans === 'lease' || trans === 'long_term') listingType = 'rent';
        else if (trans === 'short_term' || trans === 'airbnb') listingType = 'short_term';
        else listingType = 'sale';
      } else if (hasRentKeyword) {
        listingType = 'rent';
        if (lowerTitle.includes('airbnb') || lowerTitle.includes('short stay')) {
          listingType = 'short_term';
        }
      }

      // ── Build property object ──────────────────────────────────
      const newProp = {
        title,
        listingType: listingType,
        propertyType: oldProp.type || 'apartment',
        estate: oldProp.estate || 'Unknown',
        county: oldProp.county || 'Nairobi',
        price: parseFloat(oldProp.price) || 0,
        bedrooms: parseInt(oldProp.specs?.bedrooms) || 0,
        bathrooms: parseInt(oldProp.specs?.bathrooms) || 0,
        parking: parseInt(oldProp.specs?.parking) || 0,
        sqft: parseFloat(oldProp.specs?.sqft) || 0,
        description: oldProp.description || '',
        images: Array.isArray(oldProp.images) ? oldProp.images : [],
        amenities: Array.isArray(oldProp.features) ? oldProp.features : [],
        ownerId: adminUser._id,
        status: 'approved',
        featured: oldProp.isFeatured || false,
        views: 0,
        createdAt: oldProp.createdAt ? new Date(oldProp.createdAt) : new Date(),
        updatedAt: new Date()
      };

      // ── Generate slug ──────────────────────────────────────────
      const slug = await generateUniqueSlug(newProp.title);
      newProp.slug = slug;

      // ── Check for duplicates ────────────────────────────────────
      const existing = await Property.findOne({ slug });
      if (existing) {
        console.log(`⏭️ Skipping duplicate: "${newProp.title}" (slug: ${slug})`);
        skipped++;
        continue;
      }

      // ── Save to database ──────────────────────────────────────
      try {
        await Property.create(newProp);
        imported++;
        console.log(`✅ Imported: "${newProp.title}" (${listingType})`);
      } catch (err) {
        console.error(`❌ Failed to import "${newProp.title}":`, err.message);
        skipped++;
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`📊 Imported: ${imported}, Skipped: ${skipped}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}