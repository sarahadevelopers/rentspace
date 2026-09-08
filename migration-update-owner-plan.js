// migration-update-owner-plan.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Property = require('./models/Property');
const User = require('./models/User');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected');

  // Get all properties with ownerId
  const properties = await Property.find({});
  console.log(`📊 Found ${properties.length} properties`);

  let updated = 0;
  let skipped = 0;

  for (const prop of properties) {
    // Find the user who owns this property
    const user = await User.findById(prop.ownerId);
    if (user && user.subscriptionPlan) {
      // Only update if the plan is different or missing
      if (prop.ownerSubscriptionPlan !== user.subscriptionPlan) {
        prop.ownerSubscriptionPlan = user.subscriptionPlan;
        await prop.save();
        updated++;
        console.log(`✅ Updated property "${prop.title}" → ${user.subscriptionPlan}`);
      } else {
        skipped++;
      }
    } else {
      // If user not found or no plan, set to 'free'
      if (!prop.ownerSubscriptionPlan || prop.ownerSubscriptionPlan === 'free') {
        skipped++;
      } else {
        prop.ownerSubscriptionPlan = 'free';
        await prop.save();
        updated++;
        console.log(`✅ Reset property "${prop.title}" → free (no user plan found)`);
      }
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   ✅ Updated: ${updated} properties`);
  console.log(`   ⏭️ Skipped: ${skipped} properties (already correct)`);
  console.log(`   📊 Total: ${properties.length} properties`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});