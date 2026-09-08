const mongoose = require('mongoose');
const Subscription = require('./models/Subscription'); // adjust path if needed
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Find pending subscriptions
    const pendingCount = await Subscription.countDocuments({ status: 'pending' });
    console.log(`📋 Found ${pendingCount} pending subscription(s)`);

    if (pendingCount > 0) {
      const result = await Subscription.deleteMany({ status: 'pending' });
      console.log(`✅ Deleted ${result.deletedCount} pending subscription(s)`);
    } else {
      console.log('ℹ️ No pending subscriptions to delete.');
    }

    process.exit();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });