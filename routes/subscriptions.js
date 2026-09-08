const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Property = require('../models/Property');
const { 
  sendSubscriptionConfirmationEmail,
  sendRenewalReminderEmail,
  sendExpiredEmail
} = require('../config/email');

// ─── Plan definitions ──────────────────────────────────────────
const PLANS = {
  free: {
    name: 'Bronze',
    listings: 1,
    price: 0,
    featured: false,
    analytics: false,
    badge: false
  },
  basic: {
    name: 'Silver',
    listings: 15,
    price: 999,
    featured: false,
    analytics: true,
    badge: false
  },
  pro: {
    name: 'Gold',
    listings: 40,
    price: 1999,
    featured: true,
    analytics: true,
    badge: true
  },
  developer: {
    name: 'Platinum',
    listings: Infinity,
    price: 3999,
    featured: true,
    analytics: true,
    badge: true
  }
};

// ─── Helper: Check if user has an active subscription ──────────
function hasActiveSubscription(user) {
  if (!user.subscriptionPlan || user.subscriptionPlan === 'free') return false;
  if (!user.subscriptionExpiry) return false;
  return new Date(user.subscriptionExpiry) > new Date();
}

// ─── Helper: Get duration in days based on period ──────────────
function getDurationDays(period) {
  if (period === 'quarterly') return 90;
  return 30; // default monthly
}

// ─── GET /api/subscriptions/plans ──────────────────────────────
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// ─── POST /api/subscriptions/subscribe ─────────────────────────
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { plan, phoneNumber, period } = req.body; // period: 'monthly' or 'quarterly'

    // ─── Validate input ────────────────────────────────────────
    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const planData = PLANS[plan];
    const amount = planData.price;

    // ─── Determine duration based on period ────────────────────
    const durationDays = getDurationDays(period); // 30 or 90
    const now = new Date();

    // ─── Check for existing active subscription ────────────────
    if (hasActiveSubscription(user)) {
      // Allow renewal – do not block, but we'll handle it.
      // We'll still allow the payment, and the webhook will extend from current expiry.
      // No error – just proceed.
      console.log(`🔄 Renewal requested for user ${user.email}`);
    }

    // ─── Free plan ──────────────────────────────────────────────
    if (amount === 0) {
      user.subscriptionPlan = plan;
      user.subscriptionExpiry = null;
      user.trialStartDate = user.trialStartDate || new Date();
      await user.save();

      const subscription = new Subscription({
        userId,
        plan,
        status: 'active',
        paymentStatus: 'paid',
        transactionRef: `FREE-${uuidv4().slice(0, 8)}`,
        amount: 0,
        renewalDate: null,
        phone: null
      });
      await subscription.save();

      try {
        await sendSubscriptionConfirmationEmail(user.email, user.name, plan, 0);
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      return res.json({
        success: true,
        message: 'Free plan activated',
        plan: planData
      });
    }

    // ─── Paid plan – forward to IntaSend payment service ──────
    const transactionRef = `RENT-${uuidv4().slice(0, 8)}`;

    // ─── Create subscription (provisional, will be updated by webhook) ──
    const subscription = new Subscription({
      userId,
      plan,
      status: 'pending',
      paymentStatus: 'pending',
      transactionRef,
      amount,
      phone: phoneNumber,
      renewalDate: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000) // provisional
    });
    await subscription.save();

    const intasendServiceUrl = process.env.INTASEND_SERVICE_URL || 'https://sarahapay-intasend.onrender.com';
    const callbackUrl = process.env.INTASEND_CALLBACK_URL || 'https://rentspace-markeplace.onrender.com/api/payment-callback';

    // ─── Call sarahapay-intasend ──────────────────────────────
    const response = await axios.post(
      `${intasendServiceUrl}/api/pay`,
      {
        phone: phoneNumber,
        amount: amount,
        plan: plan,
        userId: userId,
        website: 'rentspace',
        callbackUrl: callbackUrl,
        name: user.name || 'RentSpace User'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': process.env.API_SECRET
        },
        timeout: 15000
      }
    );

    console.log('📤 Proxy response data:', JSON.stringify(response.data, null, 2));

    // ─── Store metadata with duration and period ──────────────
    const checkoutId = response.data.checkoutId || response.data.checkout_id || response.data.id || response.data.invoice_id;
    const apiRef = response.data.api_ref || response.data.reference || response.data.transactionRef || null;

    if (!checkoutId) {
      console.warn('⚠️ No checkout_id found in proxy response. Using transactionRef as fallback.');
    }

    subscription.metadata = {
      ...subscription.metadata,
      checkout_id: checkoutId || transactionRef,
      api_ref: apiRef,
      durationDays: durationDays,        // ← STORE DURATION
      period: period || 'monthly',       // ← STORE PERIOD
      intasendResponse: response.data,
      initiatedAt: new Date()
    };
    await subscription.save();

    console.log(`✅ Subscription ${transactionRef} created with checkout_id: ${checkoutId || 'NOT_FOUND'}`);

    res.json({
      success: true,
      message: 'STK push initiated. Check your phone for M-Pesa prompt.',
      transactionRef,
      checkoutId: checkoutId || transactionRef
    });

  } catch (error) {
    console.error('Subscription error:', {
      message: error.message,
      response: error.response?.data || 'No response data',
      status: error.response?.status
    });

    const errorMsg = error.response?.data?.error || 'Payment initiation failed';
    const statusCode = error.response?.status || 500;

    res.status(statusCode).json({
      success: false,
      error: errorMsg
    });
  }
});

// ─── POST /api/payment-callback (Called by sarahapay-intasend) ──
// This is the callback from the proxy – we keep it for backward compatibility.
// The main webhook is in server.js, but this is also used.
router.post('/payment-callback', async (req, res) => {
  try {
    const payload = req.body;
    const { transactionRef, userId, plan, status, mpesaReceipt } = payload;

    console.log(`📥 Payment callback received: ${transactionRef} | ${status}`);

    const subscription = await Subscription.findOne({ transactionRef });
    if (!subscription) {
      console.warn(`⚠️ No subscription found for ref: ${transactionRef}`);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.status !== 'pending') {
      console.log(`⏭️ Subscription ${transactionRef} already processed (status: ${subscription.status})`);
      return res.status(200).send('OK');
    }

    if (status === 'completed' || status === 'COMPLETE' || status === 'success') {
      // Update subscription
      subscription.status = 'active';
      subscription.paymentStatus = 'paid';
      subscription.metadata = {
        ...subscription.metadata,
        mpesaReceipt,
        paidAt: new Date(),
        verifiedBy: 'callback',
        callbackPayload: payload
      };
      await subscription.save();

      // Update user with renewal logic
      const user = await User.findById(userId);
      if (user) {
        const previousPlan = user.subscriptionPlan;
        const durationDays = subscription.metadata?.durationDays || 30;

        // Compute new expiry: extend from current expiry or from now
        const currentExpiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
        const now = new Date();
        let newExpiry;
        if (currentExpiry && currentExpiry > now) {
          // Renewal: extend from current expiry
          newExpiry = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
        } else {
          newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        }

        user.subscriptionPlan = plan;
        user.subscriptionExpiry = newExpiry;
        user.mpesaReceipt = mpesaReceipt;
        user.transactionRef = transactionRef;
        await user.save();

        // Update properties
        await Property.updateMany(
          { ownerId: user._id },
          { $set: { ownerSubscriptionPlan: plan } }
        );

        console.log(`✅ User ${user.email} upgraded from ${previousPlan || 'free'} to ${plan} via callback (expiry: ${newExpiry.toISOString()})`);

        try {
          await sendSubscriptionConfirmationEmail(user.email, user.name, plan, subscription.amount);
          console.log(`✅ Confirmation email sent to ${user.email}`);
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      } else {
        console.warn(`⚠️ User ${userId} not found`);
      }
    } else {
      subscription.status = 'cancelled';
      subscription.paymentStatus = 'failed';
      await subscription.save();
      console.log(`❌ Payment failed for ${transactionRef}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Payment callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// ─── POST /api/subscriptions/intasend-webhook (Legacy) ──
router.post('/intasend-webhook', async (req, res) => {
  console.log('📥 Legacy webhook called (intasend-webhook) — ignoring.');
  res.status(200).send('OK');
});

// ─── POST /api/subscriptions/verify-payment (Manual fallback) ──
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { transactionRef, mpesaReceipt } = req.body;
    if (!transactionRef) {
      return res.status(400).json({ error: 'Transaction reference required' });
    }

    const subscription = await Subscription.findOne({
      transactionRef,
      userId: req.user._id,
      status: 'pending'
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No pending subscription found' });
    }

    if (!mpesaReceipt) {
      return res.status(400).json({ error: 'M-Pesa receipt number required' });
    }

    subscription.status = 'active';
    subscription.paymentStatus = 'paid';
    subscription.metadata = {
      ...subscription.metadata,
      mpesaReceipt,
      verifiedAt: new Date(),
      verifiedBy: 'manual'
    };
    await subscription.save();

    const user = await User.findById(subscription.userId);
    if (user) {
      const previousPlan = user.subscriptionPlan;
      const durationDays = subscription.metadata?.durationDays || 30;
      const currentExpiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
      const now = new Date();
      let newExpiry;
      if (currentExpiry && currentExpiry > now) {
        newExpiry = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
      } else {
        newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      }

      user.subscriptionPlan = subscription.plan;
      user.subscriptionExpiry = newExpiry;
      await user.save();

      await Property.updateMany(
        { ownerId: user._id },
        { $set: { ownerSubscriptionPlan: subscription.plan } }
      );

      console.log(`✅ User ${user.email} upgraded via manual verification (expiry: ${newExpiry.toISOString()})`);
    }

    res.json({
      success: true,
      message: 'Subscription activated manually',
      subscription
    });
  } catch (error) {
    console.error('Manual verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── GET /api/subscriptions/status (Check current subscription) ──
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isActive = hasActiveSubscription(user);

    res.json({
      success: true,
      subscription: {
        plan: user.subscriptionPlan || 'free',
        isActive,
        expiresAt: user.subscriptionExpiry,
        trialStartDate: user.trialStartDate,
        daysRemaining: isActive && user.subscriptionExpiry
          ? Math.max(0, Math.ceil((new Date(user.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)))
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// ─── GET /api/subscriptions/check-expiry ─────────────────────────
router.get('/check-expiry', async (req, res) => {
  try {
    const secret = req.query.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ─── Users expiring in 3 days ──────────────────────────────
    const expiringUsers = await User.find({
      subscriptionPlan: { $ne: 'free' },
      subscriptionExpiry: { $gt: now, $lt: threeDaysFromNow },
      $or: [{ lastReminderSent: { $lt: now } }, { lastReminderSent: null }]
    });

    let reminderCount = 0;
    for (const user of expiringUsers) {
      const daysRemaining = Math.ceil((user.subscriptionExpiry - now) / (1000 * 60 * 60 * 24));
      if (daysRemaining === 3) {
        try {
          await sendRenewalReminderEmail(user.email, user.name, user.subscriptionPlan, daysRemaining);
          user.lastReminderSent = now;
          await user.save();
          reminderCount++;
        } catch (err) {
          console.error(`❌ Reminder failed for ${user.email}:`, err.message);
        }
      }
    }

    // ─── Users expired today ────────────────────────────────────
    const expiredUsers = await User.find({
      subscriptionPlan: { $ne: 'free' },
      subscriptionExpiry: { $gt: oneDayAgo, $lt: now },
      expiredEmailSent: false
    });

    let expiredCount = 0;
    for (const user of expiredUsers) {
      try {
        await sendExpiredEmail(user.email, user.name, user.subscriptionPlan);
        user.expiredEmailSent = true;
        await user.save();
        expiredCount++;
      } catch (err) {
        console.error(`❌ Expired email failed for ${user.email}:`, err.message);
      }
    }

    res.json({
      success: true,
      expiringRemindersSent: reminderCount,
      expiredEmailsSent: expiredCount
    });
  } catch (error) {
    console.error('❌ check-expiry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;