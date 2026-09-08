const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const ObjectId = mongoose.Types.ObjectId;

    // ─── 1. John's userId ────────────────────────────────────────
    const userId = new ObjectId("6a9e2950af6307d55bd03f06");

    // ─── 2. Add the missing phone field ──────────────────────────
    console.log("📋 Adding phone field to John's subscriptions...");
    const phoneUpdateResult = await mongoose.connection.collection('subscriptions').updateMany(
      { 
        userId: userId, 
        status: "pending" 
      },
      { 
        $set: { 
          phone: "254723562484" 
        } 
      }
    );
    console.log(`✅ Added phone field to ${phoneUpdateResult.modifiedCount} subscription(s)`);

    // ─── 3. Activate all pending subscriptions ────────────────────
    console.log("📋 Activating John's pending subscriptions...");
    const activateResult = await mongoose.connection.collection('subscriptions').updateMany(
      { 
        userId: userId, 
        status: "pending" 
      },
      {
        $set: {
          status: "active",
          paymentStatus: "paid",
          "metadata.mpesaReceipt": "UI72W55S5P",
          "metadata.paidAt": new Date(),
          "metadata.verifiedBy": "manual_activation_script"
        }
      }
    );
    console.log(`✅ Activated ${activateResult.modifiedCount} pending subscription(s)`);

    // ─── 4. Update the user document ──────────────────────────────
    console.log("📋 Updating John's user document...");
    const userResult = await mongoose.connection.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          subscriptionPlan: "basic",
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          mpesaReceipt: "UI72W55S5P",
          transactionRef: "PAY-1788752106467-4kqmoi"
        }
      }
    );
    console.log(`✅ Updated user document (modified: ${userResult.modifiedCount})`);

    // ─── 5. Verify the results ─────────────────────────────────────
    console.log("\n📊 VERIFICATION:");
    const pendingSubs = await mongoose.connection.collection('subscriptions').countDocuments({ 
      userId: userId, 
      status: "pending" 
    });
    const activeSubs = await mongoose.connection.collection('subscriptions').countDocuments({ 
      userId: userId, 
      status: "active" 
    });
    const user = await mongoose.connection.collection('users').findOne({ _id: userId });

    console.log(`📋 Pending subscriptions: ${pendingSubs}`);
    console.log(`📋 Active subscriptions: ${activeSubs}`);
    console.log(`📋 User plan: ${user?.subscriptionPlan || 'free'}`);
    console.log(`📋 User expiry: ${user?.subscriptionExpiry || 'null'}`);

    console.log("\n✅ John Rwanda's subscription is now ACTIVE!");

    process.exit();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });