// check-properties.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Property = require('./models/Property');

async function check() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const count = await Property.countDocuments();
  console.log(`📊 Total properties: ${count}`);

  if (count > 0) {
    const sample = await Property.find().limit(3);
    sample.forEach(p => {
      console.log(`\n📝 ${p.title}`);
      console.log(`   listingType: ${p.listingType}`);
      console.log(`   propertyType: ${p.propertyType}`);
      console.log(`   available_for: ${p.available_for || '❌ MISSING'}`);
      console.log(`   rental_type: ${p.rental_type || '❌ MISSING'}`);
    });
  }

  await mongoose.disconnect();
}

check();