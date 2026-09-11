// reset-admin.js — ONE-TIME ADMIN PASSWORD RESET
// ⚠️ DO NOT COMMIT THIS FILE TO GIT
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// ─── Fill these in before running ─────────────────────────
const ADMIN_EMAIL  = 'rentspacekenya@gmail.com';       // ← existing admin email
const NEW_PASSWORD = '33778477isme';      // ← strong, unique password
// ──────────────────────────────────────────────────────────

async function resetAdmin() {
  if (NEW_PASSWORD.startsWith('REPLACE')) {
    console.error('❌ Please edit reset-admin.js and set NEW_PASSWORD.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  // Find the admin
  const admin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

  if (!admin) {
    console.error(`❌ No user found with email: ${ADMIN_EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`👤 Found user: ${admin.email}`);
  console.log(`   Current role: ${admin.role}`);
  console.log(`   Verified: ${admin.verified}`);

  // Reset everything needed
  admin.password = NEW_PASSWORD;              // ← auto-hashed by pre-save hook
  admin.role = 'admin';
  admin.verified = true;
  admin.subscriptionPlan = 'developer';
  admin.subscriptionExpiry = null;

  await admin.save();

  console.log(`\n✅ Admin updated successfully!`);
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Role:     ${admin.role}`);
  console.log(`   Verified: ${admin.verified}`);
  console.log(`\n🎉 You can now log in at rentspace.co.ke/login.html`);
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: [the one you set in the script]\n`);

  await mongoose.disconnect();
  process.exit(0);
}

resetAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});