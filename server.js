// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// ─── Import route modules ──────────────────────────────────────────
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const postRoutes = require('./routes/posts');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');

// ─── Import models (used in webhook) ──────────────────────────────
const User = require('./models/User');
const Property = require('./models/Property');
const Subscription = require('./models/Subscription');

// ─── Initialize Express app ────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Fix for express-rate-limit behind Render's proxy
app.set('trust proxy', 1);

// ─── CORS configuration ─────────────────────────────────────────────
const allowedOrigins = [
  'https://sarahadevelopers.github.io',
  'https://rentspace-markeplace.onrender.com',
  'https://rentspace.co.ke',
  'http://localhost:5000',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ─── Body parsing middleware ──────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'RentSpace API is running' });
});

// ─── API routes (order matters) ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

// =====================================================================
// Webhook from sarahapay-intasend
// DEFINED BEFORE the subscription router so a wildcard route in
// subscriptionRoutes cannot intercept /saraha-webhook
// =====================================================================
app.post('/api/subscriptions/saraha-webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('📥 Webhook received from sarahapay:', payload);

    const { checkout_id, status, mpesa_receipt, amount, phone, reference } = payload;

    if (status !== 'paid') {
      console.log(`⏭️ Payment status is "${status}", ignoring.`);
      return res.status(200).json({ message: 'Ignored' });
    }

    // ─── Step 1: Find the subscription ──────────────────────────
    let subscription = null;

    // 1. By checkout_id
    if (checkout_id) {
      subscription = await Subscription.findOne({ 'metadata.checkout_id': checkout_id });
      if (subscription) console.log(`✅ Found subscription by checkout_id: ${checkout_id}`);
    }

    // 2. By api_ref (metadata)
    if (!subscription && reference) {
      subscription = await Subscription.findOne({ 'metadata.api_ref': reference });
      if (subscription) console.log(`✅ Found subscription by api_ref: ${reference}`);
    }

    // 3. By transactionRef
    if (!subscription && reference) {
      subscription = await Subscription.findOne({ transactionRef: reference });
      if (subscription) console.log(`✅ Found subscription by transactionRef: ${reference}`);
    }

    // 4. By payment phone
    if (!subscription && phone) {
      subscription = await Subscription.findOne({
        phone: phone,
        status: 'pending'
      }).sort({ createdAt: -1 });
      if (subscription) console.log(`✅ Found subscription by payment phone: ${phone}`);
    }

    // 5. Fallback: phone → user → pending subscription
    if (!subscription && phone) {
      const userPhone = phone;
      let user = await User.findOne({ phone: userPhone });
      if (!user && userPhone.startsWith('254')) {
        user = await User.findOne({ phone: userPhone.replace(/^254/, '0') });
      }
      if (!user && !userPhone.startsWith('254')) {
        user = await User.findOne({ phone: '254' + userPhone.replace(/^0/, '') });
      }
      if (user) {
        subscription = await Subscription.findOne({
          userId: user._id,
          status: 'pending'
        }).sort({ createdAt: -1 });
        if (subscription) console.log(`✅ Found subscription via phone fallback for ${user.email}`);
      }
    }

    if (!subscription) {
      console.warn(`⚠️ No pending subscription found (checkout_id: ${checkout_id}, ref: ${reference}, phone: ${phone})`);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // ─── Step 2: Get the user ────────────────────────────────────
    const user = await User.findById(subscription.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`👤 Found user: ${user.email}`);

    // ─── Step 3: Determine plan from amount ──────────────────────
    let planName = 'basic';
    const amt = parseFloat(amount);
    if (amt >= 10) planName = 'developer';
    else if (amt >= 5) planName = 'pro';
    else if (amt >= 2) planName = 'basic';

    // ─── Step 4: Activate all pending subscriptions for this user ──
    const result = await Subscription.updateMany(
      { userId: user._id, status: 'pending' },
      {
        $set: {
          status: 'active',
          paymentStatus: 'paid',
          'metadata.mpesaReceipt': mpesa_receipt || reference,
          'metadata.paidAt': new Date(),
          'metadata.verifiedBy': 'webhook',
          'metadata.callbackPayload': payload
        }
      }
    );

    if (result.nModified === 0) {
      // No pending subs — update the one we found directly
      subscription.status = 'active';
      subscription.paymentStatus = 'paid';
      subscription.metadata = {
        ...subscription.metadata,
        mpesaReceipt: mpesa_receipt || reference,
        paidAt: new Date(),
        verifiedBy: 'webhook',
        callbackPayload: payload
      };
      await subscription.save();
    }

    // ─── Step 5: Update user with RENEWAL support ─────────────────
    const durationDays = subscription.metadata?.durationDays || 30;
    const currentExpiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
    const now = new Date();

    let newExpiry;
    if (currentExpiry && currentExpiry > now) {
      // Renewal — extend from current expiry
      newExpiry = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
      console.log(`🔄 Renewal: extending from ${currentExpiry.toISOString()} by ${durationDays} days`);
    } else {
      // New subscription or expired — start from now
      newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      console.log(`🆕 New subscription: starting from now, ${durationDays} days`);
    }

    user.subscriptionPlan = planName;
    user.subscriptionExpiry = newExpiry;
    user.mpesaReceipt = mpesa_receipt || reference;
    user.transactionRef = reference || checkout_id;
    await user.save();

    subscription.renewalDate = newExpiry;
    await subscription.save();

    // ─── Step 6: Re-activate expired listings + update plan ──────
    // ─── Step 6: Re-activate expired listings + extend expiry on all ──
await Property.updateMany(
  { ownerId: user._id, status: 'expired' },
  {
    $set: {
      ownerSubscriptionPlan: planName,
      status: 'approved',
      expiresAt: newExpiry
    }
  }
);

// Extend expiry AND update plan on all remaining active listings
await Property.updateMany(
  { ownerId: user._id, status: { $ne: 'expired' } },
  {
    $set: {
      ownerSubscriptionPlan: planName,
      expiresAt: newExpiry        // ← THIS is the change
    }
  }
);

    console.log(`✅ Subscription upgraded for ${user.email} (plan: ${planName})`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Subscription routes (AFTER webhook) ─────────────────────────
app.use('/api/subscriptions', subscriptionRoutes);

// ─── Serve static frontend files ──────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── SPA fallback ──────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Connect to MongoDB and start server ─────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📁 Frontend: http://localhost:${PORT}`);
      console.log(`🔌 API: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`🏠 Properties: http://localhost:${PORT}/api/properties`);
      console.log(`💳 Subscriptions: http://localhost:${PORT}/api/subscriptions/plans`);
      console.log(`🔔 Webhook: http://localhost:${PORT}/api/subscriptions/saraha-webhook`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });