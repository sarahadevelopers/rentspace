// scripts/assign-admin-owner.js
// Run: node scripts/assign-admin-owner.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');

// ─── Connect to MongoDB ────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await assignAdminOwner();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function assignAdminOwner() {
  try {
    // ── 1. Find the admin user ──────────────────────────────────
    const admin = await User.findOne({ email: 'admin@rentspace.co.ke' });
    if (!admin) {
      console.log('⚠️ Admin user not found. Creating one...');
      const newAdmin = await User.create({
        name: 'Admin',
        email: 'admin@rentspace.co.ke',
        phone: '254700000000',
        password: 'Admin123!',
        role: 'admin',
        verified: true
      });
      console.log(`✅ Admin user created with ID: ${newAdmin._id}`);
      // Use the new admin for ownership
      var adminId = newAdmin._id;
    } else {
      console.log(`✅ Found admin user: ${admin.email} (ID: ${admin._id})`);
      var adminId = admin._id;
    }

    // ── 2. Update all properties to be owned by this admin ────
    const result = await Property.updateMany(
      {}, // match all
      { $set: { ownerId: adminId } }
    );

    console.log(`✅ Updated ${result.nModified} properties to owner: ${adminId}`);

    // ── 3. Verify (optional) ─────────────────────────────────────
    const count = await Property.countDocuments({ ownerId: adminId });
    console.log(`📊 Total properties now owned by admin: ${count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}