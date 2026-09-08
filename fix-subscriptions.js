const mongoose = require('mongoose');
const { ObjectId } = require('mongodb'); // ✅ Import ObjectId from the MongoDB driver
require('dotenv').config();

// ─── Connect to MongoDB ──────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // ─── 1. Define the user ID and checkout IDs ──────────────────
    const userId = new ObjectId("6a9d427264821ead40a5972b");

    const subscriptionsToFix = [
      { id: new ObjectId("6a9d446764821ead40a5972c"), checkoutId: "YMDQGER" },
      { id: new ObjectId("6a9d476764821ead40a5972d"), checkoutId: "Y33G9Q7" },
      { id: new ObjectId("6a9d4ba664821ead40a5972e"), checkoutId: "YRVNO4J" }
    ];

    // ─── 2. Add checkout_id to each subscription ──────────────────
    console.log("📋 Adding checkout_id to pending subscriptions...");
    let updatedCount = 0;

    for (const sub of subscriptionsToFix) {
      const result = await mongoose.connection.collection('subscriptions').updateOne(
        { _id: sub.id },
        { 
          $set: { 
            "metadata.checkout_id": sub.checkoutId 
          } 
        }
      );
      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`✅ Added checkout_id ${sub.checkoutId} to subscription ${sub.id}`);
      } else {
        console.log(`ℹ️ Subscription ${sub.id} already has checkout_id or not found`);
      }
    }
    console.log(`📊 Added checkout_id to ${updatedCount} subscription(s)`);

    // ─── 3. Activate all pending subscriptions for this user ────
    console.log("📋 Activating all pending subscriptions for user...");
    const activateResult = await mongoose.connection.collection('subscriptions').updateMany(
      { 
        userId: userId,
        status: "pending" 
      },
      {
        $set: {
          status: "active",
          paymentStatus: "paid",
          "metadata.mpesaReceipt": "MANUAL_FIX",
          "metadata.paidAt": new Date(),
          "metadata.verifiedBy": "manual_fix"
        }
      }
    );
    console.log(`✅ Activated ${activateResult.modifiedCount} pending subscription(s)`);

    // ─── 4. Update the user document ──────────────────────────────
    console.log("📋 Updating user document...");
    const userResult = await mongoose.connection.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          subscriptionPlan: "basic",
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          mpesaReceipt: "MANUAL_FIX",
          transactionRef: "MANUAL_FIX"
        }
      }
    );
    console.log(`✅ Updated user document (modified: ${userResult.modifiedCount})`);

    // ─── 5. Verify the results ─────────────────────────────────────
    console.log("\n📊 VERIFICATION:");
    const pendingSubs = await mongoose.connection.collection('subscriptions').countDocuments({ userId: userId, status: "pending" });
    const activeSubs = await mongoose.connection.collection('subscriptions').countDocuments({ userId: userId, status: "active" });
    const user = await mongoose.connection.collection('users').findOne({ _id: userId });

    console.log(`📋 Pending subscriptions: ${pendingSubs}`);
    console.log(`📋 Active subscriptions: ${activeSubs}`);
    console.log(`📋 User plan: ${user?.subscriptionPlan || 'free'}`);
    console.log(`📋 User expiry: ${user?.subscriptionExpiry || 'null'}`);

    console.log("\n✅ Script completed successfully!");
    process.exit();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });