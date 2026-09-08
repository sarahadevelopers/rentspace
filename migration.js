// migration.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Property = require('./models/Property');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  console.log(`📡 Using URI: ${uri.replace(/\/\/[^@]+@/, '//<hidden>@')}`); // Hide password

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // 1. Land properties
    const land = await Property.updateMany(
      { listingType: 'sale', propertyType: { $regex: /land/i } },
      { $set: { available_for: 'sale', rental_type: 'sale' } }
    );
    console.log(`✅ Updated ${land.modifiedCount} land properties`);

    // 2. Short-term
    const short = await Property.updateMany(
      { listingType: 'short_term' },
      { $set: { available_for: 'short_term', rental_type: 'short_term' } }
    );
    console.log(`✅ Updated ${short.modifiedCount} short-term properties`);

    // 3. Long-term rentals
    const long = await Property.updateMany(
      { listingType: 'rent' },
      { $set: { available_for: 'long_term', rental_type: 'long_term' } }
    );
    console.log(`✅ Updated ${long.modifiedCount} long-term properties`);

    // 4. Other sale properties (houses, apartments)
    const sale = await Property.updateMany(
      { listingType: 'sale', propertyType: { $not: { $regex: /land/i } } },
      { $set: { available_for: 'sale', rental_type: 'sale' } }
    );
    console.log(`✅ Updated ${sale.modifiedCount} other sale properties`);

    console.log('🎉 Migration complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

migrate();