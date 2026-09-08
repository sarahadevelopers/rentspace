// scripts/delete-extra-admin.js
// Run: node scripts/delete-extra-admin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');

// ─── Configuration ──────────────────────────────────────────────
const KEEP_ADMIN_EMAIL = 'info@rentspace.co.ke';
const DELETE_ADMIN_EMAIL = 'admin@rentspace.co.ke';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await deleteExtraAdmin();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function deleteExtraAdmin() {
  try {
    // ── 1. Find the admin to keep ──────────────────────────────
    const keepAdmin = await User.findOne({ email: KEEP_ADMIN_EMAIL });
    if (!keepAdmin) {
      console.error(`❌ Admin "${KEEP_ADMIN_EMAIL}" not found!`);
      console.log('👉 Please create it first with scripts/fix-admin.js');
      return;
    }
    console.log(`✅ Keeping admin: ${keepAdmin.email} (ID: ${keepAdmin._id})`);

    // ── 2. Find the extra admin to delete ──────────────────────
    const deleteAdmin = await User.findOne({ email: DELETE_ADMIN_EMAIL });
    if (!deleteAdmin) {
      console.log(`ℹ️ Extra admin "${DELETE_ADMIN_EMAIL}" not found – nothing to delete.`);
      return;
    }
    console.log(`⚠️ Found extra admin: ${deleteAdmin.email} (ID: ${deleteAdmin._id})`);

    // ── 3. Reassign any properties owned by the extra admin ────
    const reassignResult = await Property.updateMany(
      { ownerId: deleteAdmin._id },
      { $set: { ownerId: keepAdmin._id } }
    );
    console.log(`✅ Reassigned ${reassignResult.nModified} properties from extra admin to ${keepAdmin.email}`);

    // ── 4. Delete the extra admin ──────────────────────────────
    await User.deleteOne({ _id: deleteAdmin._id });
    console.log(`🗑️ Deleted extra admin: ${deleteAdmin.email}`);

    // ── 5. Verify ──────────────────────────────────────────────
    const totalProperties = await Property.countDocuments({ ownerId: keepAdmin._id });
    console.log(`📊 Total properties now owned by ${keepAdmin.email}: ${totalProperties}`);

    const adminCount = await User.countDocuments({ role: 'admin' });
    console.log(`📊 Total admin users remaining: ${adminCount}`);

    console.log('\n✅ Done! Log in with:');
    console.log(`   Email: ${KEEP_ADMIN_EMAIL}`);
    console.log('   Password: Admin123!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}