// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// Import route modules
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const postRoutes = require('./routes/posts');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Import models
const User = require('./models/User');
const Property = require('./models/Property');
const Subscription = require('./models/Subscription');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Fix for express-rate-limit behind Render's proxy
app.set('trust proxy', 1);

// ----- CORS (allow frontend & backend) -----
const allowedOrigins = [
  'https://sarahadevelopers.github.io',          // Keep for dev
  'https://rentspace-markeplace.onrender.com',   // Keep for self-calls
  'https://rentspace.co.ke',                     // ✅ ADD THIS
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

// ----- Body parsing -----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- API routes -----
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'RentSpace API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// =============================================
// Webhook from sarahapay-intasend (FULLY FIXED + RENEWAL SUPPORT)
// =============================================
app.post('/api/subscriptions/saraha-webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('📥 Webhook received from sarahapay:', payload);

    const { checkout_id, status, mpesa_receipt, amount, phone, name, reference } = payload;

    if (status !== 'paid') {
      console.log(`⏭️ Payment status is "${status}", ignoring.`);
      return res.status(200).json({ message: 'Ignored' });
    }

    // ─── Step 1: Find the subscription ──────────────────────────────
    let subscription = null;

    // 1. Try by checkout_id (stored in metadata)
    if (checkout_id) {
      subscription = await Subscription.findOne({
        'metadata.checkout_id': checkout_id
      });
      if (subscription) console.log(`✅ Found subscription by checkout_id: ${checkout_id}`);
    }

    // 2. Try by api_ref (stored in metadata)
    if (!subscription && reference) {
      subscription = await Subscription.findOne({
        'metadata.api_ref': reference
      });
      if (subscription) console.log(`✅ Found subscription by api_ref: ${reference}`);
    }

    // 3. Try by transactionRef (RENT-... or PAY-...)
    if (!subscription && reference) {
      subscription = await Subscription.findOne({ transactionRef: reference });
      if (subscription) console.log(`✅ Found subscription by transactionRef: ${reference}`);
    }

    // ✅ 4. Try by payment phone (stored directly on subscription)
    if (!subscription && phone) {
      subscription = await Subscription.findOne({
        phone: phone,
        status: 'pending'
      }).sort({ createdAt: -1 });
      if (subscription) console.log(`✅ Found subscription by payment phone: ${phone}`);
    }

    // 5. Fallback: phone-based user lookup (legacy)
    if (!subscription && phone) {
      let userPhone = phone;
      let user = await User.findOne({ phone: userPhone });
      if (!user && userPhone.startsWith('254')) {
        const altPhone = userPhone.replace(/^254/, '0');
        user = await User.findOne({ phone: altPhone });
      }
      if (!user && !userPhone.startsWith('254')) {
        const altPhone = '254' + userPhone.replace(/^0/, '');
        user = await User.findOne({ phone: altPhone });
      }
      if (user) {
        subscription = await Subscription.findOne({
          userId: user._id,
          status: 'pending'
        }).sort({ createdAt: -1 });
        if (subscription) console.log(`✅ Found subscription by user phone fallback for user ${user.email}`);
      }
    }

    if (!subscription) {
      console.warn(`⚠️ No pending subscription found for checkout_id: ${checkout_id}, api_ref: ${reference}, transactionRef: ${reference}, or phone: ${phone}`);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // ─── Step 2: Get the user from the subscription ──────────────
    const user = await User.findById(subscription.userId);
    if (!user) {
      console.warn(`❌ User not found for subscription ${subscription.transactionRef}`);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`👤 Found user: ${user.email} (ID: ${user._id})`);

    // ─── Step 3: Determine plan from amount ──────────────────────
    let planName = 'basic';
    const amt = parseFloat(amount);
    if (amt >= 10) planName = 'developer';
    else if (amt >= 5) planName = 'pro';
    else if (amt >= 2) planName = 'basic';

    // ─── Step 4: Update ALL pending subscriptions for this user ──
    const result = await Subscription.updateMany(
      {
        userId: user._id,
        status: 'pending'
      },
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

    console.log(`📝 Updated ${result.nModified} pending subscription(s) for user ${user.email}`);

    if (result.nModified === 0) {
      // If none updated, update the one we found
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
      console.log(`✅ Subscription ${subscription.transactionRef} updated directly`);
    }

    // ─── Step 5: Update the user document (with RENEWAL support) ──
    // Get duration from subscription metadata (default 30 if not set)
    const durationDays = subscription.metadata?.durationDays || 30;

    // Determine current expiry (if any)
    const currentExpiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
    const now = new Date();

    // Compute new expiry: extend from max(currentExpiry, now)
    let newExpiry;
    if (currentExpiry && currentExpiry > now) {
      // ✅ RENEWAL: extend from current expiry
      newExpiry = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
      console.log(`🔄 Renewal: extending from ${currentExpiry.toISOString()} by ${durationDays} days`);
    } else {
      // ✅ NEW SUBSCRIPTION or EXPIRED: start from now
      newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      console.log(`🆕 New subscription: starting from now, ${durationDays} days`);
    }

    // Update user
    user.subscriptionPlan = planName;
    user.subscriptionExpiry = newExpiry;
    user.mpesaReceipt = mpesa_receipt || reference;
    user.transactionRef = reference || checkout_id;
    await user.save();

    // ✅ Also update the subscription's renewalDate to the new expiry
    subscription.renewalDate = newExpiry;
    await subscription.save();
    console.log(`📅 Subscription expiry set to: ${newExpiry.toISOString()}`);

    // ─── Step 6: Update all properties owned by this user ──────
    await Property.updateMany(
      { ownerId: user._id },
      { $set: { ownerSubscriptionPlan: planName } }
    );

    console.log(`✅ Subscription upgraded for ${user.email} (plan: ${planName})`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----- Serve static frontend files -----
app.use(express.static(path.join(__dirname)));

// ----- SPA fallback -----
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ----- Connect to MongoDB and start server -----
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