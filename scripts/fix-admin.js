// scripts/fix-admin.js
// Run: node scripts/fix-admin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const TARGET_EMAIL = 'info@rentspace.co.ke';
const TARGET_PASSWORD = 'Admin123!';
const TARGET_PHONE = '254723562484'; // your number without leading 0

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await fixAdmin();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function fixAdmin() {
  try {
    // 1. Find or create the admin user
    let admin = await User.findOne({ email: TARGET_EMAIL });
    if (!admin) {
      console.log(`⚠️ Admin user "${TARGET_EMAIL}" not found. Creating...`);
      admin = new User({
        name: 'Admin',
        email: TARGET_EMAIL,
        phone: TARGET_PHONE,
        password: TARGET_PASSWORD,
        role: 'admin',
        verified: true
      });
      await admin.save();
      console.log(`✅ Admin user created with ID: ${admin._id}`);
    } else {
      console.log(`✅ Found admin user: ${admin.email}`);
      // Update password and phone
      admin.password = TARGET_PASSWORD;
      admin.phone = TARGET_PHONE;
      await admin.save();
      console.log(`✅ Password and phone updated for ${admin.email}`);
    }

    // 2. Optionally remove the old admin user (admin@rentspace.co.ke) if it exists and is different
    const oldAdmin = await User.findOne({ email: 'admin@rentspace.co.ke' });
    if (oldAdmin && oldAdmin.email !== TARGET_EMAIL) {
      console.log(`⚠️ Found old admin user: ${oldAdmin.email}. Deleting it to avoid confusion...`);
      // Reassign properties from old admin to new admin?
      // Since properties are already assigned to the correct admin (info@rentspace.co.ke), we can delete safely.
      await User.deleteOne({ _id: oldAdmin._id });
      console.log(`✅ Old admin user deleted.`);
    }

    // 3. Verify
    const count = await User.countDocuments({ role: 'admin' });
    console.log(`📊 Total admin users now: ${count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}