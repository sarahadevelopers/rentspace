// scripts/sync-slugs.js
// Run: node scripts/sync-slugs.js

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Property = require('../models/Property');

// ─── Read properties.json ──────────────────────────────────────
const jsonPath = path.join(__dirname, '..', 'data', 'properties.json');
const propertiesJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ─── Connect to MongoDB ────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await syncSlugs();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function syncSlugs() {
  try {
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const jsonProp of propertiesJson) {
      const title = jsonProp.title;
      const newSlug = jsonProp.slug;

      if (!title) {
        console.warn(`⚠️ No 'title' field in JSON for property ID ${jsonProp.id}`);
        notFound++;
        continue;
      }
      if (!newSlug) {
        console.warn(`⚠️ No 'slug' field in JSON for property: ${title}`);
        notFound++;
        continue;
      }

      // ─── Match by title ──────────────────────────────────────
      const result = await Property.findOneAndUpdate(
        { title: title },      // match by title (must be unique)
        { $set: { slug: newSlug } },
        { new: true }
      );

      if (result) {
        updated++;
        console.log(`✅ Updated: "${title}" -> slug: ${newSlug}`);
      } else {
        console.warn(`⚠️ No property found with title: "${title}"`);
        notFound++;
      }
    }

    console.log(`\n🎉 Sync complete!`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️ Not found: ${notFound}`);
    console.log(`   ❌ Errors: ${errors}`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    mongoose.disconnect();
  }
}