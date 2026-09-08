const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const now = new Date();

    // ─── Find users with expired subscriptions ──────────────────
    const users = await mongoose.connection.collection('users').find({
      subscriptionPlan: { $ne: 'free' },
      subscriptionExpiry: { $lt: now }
    }).toArray();

    console.log(`📋 Found ${users.length} expired users`);

    for (const user of users) {
      // ─── Downgrade user ──────────────────────────────────────
      await mongoose.connection.collection('users').updateOne(
        { _id: user._id },
        { $set: { subscriptionPlan: 'free', subscriptionExpiry: null } }
      );

      // ─── Downgrade all properties ────────────────────────────
      await mongoose.connection.collection('properties').updateMany(
        { ownerId: user._id },
        { $set: { ownerSubscriptionPlan: 'free' } }
      );

      console.log(`✅ Downgraded ${user.email} to free`);
    }

    console.log('✅ Done!');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });