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

// ─── Optional rate limiter (graceful fallback if not installed) ───
let rateLimit = null;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('⚠️  express-rate-limit not installed — /subscribe is UNPROTECTED.');
  console.warn('    Fix: npm install express-rate-limit');
}

const subscribeLimiter = rateLimit
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'Too many payment attempts. Please try again in 15 minutes.'
      }
    })
  : (req, res, next) => next();

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

// ─── Middleware: Verify callback came from our payment proxy ───
// Fail-closed if the secret is set; warn-and-pass if not (migration mode).
function verifyCallbackSecret(req, res, next) {
  const expected = process.env.PAYMENT_CALLBACK_SECRET;

  if (!expected) {
    console.warn('⚠️  PAYMENT_CALLBACK_SECRET not set — callback auth is DISABLED.');
    console.warn('    Set it in Render env, then update the proxy to send x-callback-secret.');
    return next();
  }

  const provided = req.headers['x-callback-secret'] || req.body?.secret;

  if (provided !== expected) {
    console.warn('🚫 Unauthorized callback attempt', {
      ip: req.ip,
      path: req.path,
      hasProvidedSecret: Boolean(provided)
    });
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  next();
}

// ─── GET /api/subscriptions/plans ──────────────────────────────
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// ─── POST /api/subscriptions/subscribe ─────────────────────────
router.post('/subscribe', authMiddleware, subscribeLimiter, async (req, res) => {
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

    // ─── Check for existing active subscription (renewals allowed) ──
    if (hasActiveSubscription(user)) {
      console.log(`🔄 Renewal requested for user ${user.email}`);
    }

    // ─── Free plan ──────────────────────────────────────────────
    if (amount === 0) {
      // Prevent duplicate free subscriptions
      const existingFree = await Subscription.findOne({
        userId,
        plan: 'free',
        status: 'active'
      });

      if (existingFree) {
        return res.status(400).json({
          success: false,
          error: 'Free plan is already active on your account.'
        });
      }

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

    // ─── Paid plan ──────────────────────────────────────────────
    // Supersede any pending subscription from the last 5 minutes
    // (prevents double-charge from a user double-clicking)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentPending = await Subscription.findOne({
      userId,
      status: 'pending',
      createdAt: { $gt: fiveMinAgo }
    });

    if (recentPending) {
      console.log(`♻️  Superseding recent pending sub ${recentPending.transactionRef}`);
      recentPending.status = 'cancelled';
      recentPending.paymentStatus = 'superseded';
      recentPending.metadata = {
        ...recentPending.metadata,
        supersededAt: new Date(),
        supersededBy: 'new-subscribe-request'
      };
      await recentPending.save();
    }

    const transactionRef = `RENT-${uuidv4().slice(0, 8)}`;

    // ─── Create subscription (provisional, updated by callback) ──
    const subscription = new Subscription({
      userId,
      plan,
      status: 'pending',
      paymentStatus: 'pending',
      transactionRef,
      amount,
      phone: phoneNumber,
      renewalDate: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
    });
    await subscription.save();

    const intasendServiceUrl =
      process.env.INTASEND_SERVICE_URL || 'https://sarahapay-intasend.onrender.com';
    const callbackUrl =
      process.env.INTASEND_CALLBACK_URL ||
      'https://rentspace-markeplace.onrender.com/api/subscriptions/payment-callback';

    // ─── Call the payment proxy ────────────────────────────────
    const response = await axios.post(
      `${intasendServiceUrl}/api/pay`,
      {
        phone: phoneNumber,
        amount,
        plan,
        userId,
        website: 'rentspace',
        callbackUrl,
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

    console.log('📤 Proxy response:', JSON.stringify(response.data, null, 2));

    const checkoutId =
      response.data.checkoutId ||
      response.data.checkout_id ||
      response.data.id ||
      response.data.invoice_id;

    const apiRef =
      response.data.api_ref ||
      response.data.reference ||
      response.data.transactionRef ||
      null;

    if (!checkoutId) {
      console.warn('⚠️  No checkout_id in proxy response — using transactionRef fallback.');
    }

    subscription.metadata = {
      ...subscription.metadata,
      checkout_id: checkoutId || transactionRef,
      api_ref: apiRef,
      durationDays,
      period: period || 'monthly',
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

// ─── POST /api/subscriptions/payment-callback ──────────────────
// Called by the payment proxy after M-PESA confirms.
// SECURED via shared secret (x-callback-secret header).
router.post('/payment-callback', verifyCallbackSecret, async (req, res) => {
  try {
    const payload = req.body;
    const { transactionRef, userId, plan, status, mpesaReceipt } = payload;

    console.log(`📥 Payment callback received: ${transactionRef} | ${status}`);

    if (!transactionRef) {
      return res.status(400).json({ error: 'transactionRef required' });
    }

    // ─── Multi-field lookup (handles proxies that send checkout_id) ──
    const subscription = await Subscription.findOne({
      $or: [
        { transactionRef },
        { 'metadata.checkout_id': transactionRef },
        { 'metadata.api_ref': transactionRef }
      ]
    });

    if (!subscription) {
      console.warn(`⚠️  No subscription found for ref: ${transactionRef}`);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // ─── Idempotency: already-processed guard ──────────────────
    if (subscription.status !== 'pending') {
      console.log(`⏭️  Subscription ${subscription.transactionRef} already processed (${subscription.status})`);
      return res.status(200).send('OK');
    }

    // ─── Success path ──────────────────────────────────────────
    if (status === 'completed' || status === 'COMPLETE' || status === 'success') {
      // Receipt uniqueness check (guards against replay / reuse)
      if (mpesaReceipt) {
        const receiptInUse = await Subscription.findOne({
          'metadata.mpesaReceipt': mpesaReceipt,
          _id: { $ne: subscription._id }
        });
        if (receiptInUse) {
          console.warn(`🚫 M-Pesa receipt already used elsewhere: ${mpesaReceipt}`);
          return res.status(400).json({ error: 'Receipt already used' });
        }
      }

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

      // ─── Activate user + extend expiry ─────────────────────
      const resolvedUserId = userId || subscription.userId;
      const user = await User.findById(resolvedUserId);

      if (user) {
        const previousPlan = user.subscriptionPlan;
        const durationDays = subscription.metadata?.durationDays || 30;

        const currentExpiry = user.subscriptionExpiry
          ? new Date(user.subscriptionExpiry)
          : null;
        const now = new Date();

        let newExpiry;
        if (currentExpiry && currentExpiry > now) {
          newExpiry = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
        } else {
          newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        }

        user.subscriptionPlan = plan || subscription.plan;
        user.subscriptionExpiry = newExpiry;
        user.mpesaReceipt = mpesaReceipt;
        user.transactionRef = subscription.transactionRef;
        await user.save();

        await Property.updateMany(
          { ownerId: user._id },
          { $set: { ownerSubscriptionPlan: user.subscriptionPlan } }
        );

        console.log(
          `✅ User ${user.email} upgraded ${previousPlan || 'free'} → ${user.subscriptionPlan} ` +
          `(expiry: ${newExpiry.toISOString()})`
        );

        try {
          await sendSubscriptionConfirmationEmail(
            user.email,
            user.name,
            user.subscriptionPlan,
            subscription.amount
          );
          console.log(`✅ Confirmation email sent to ${user.email}`);
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      } else {
        console.warn(`⚠️  User ${resolvedUserId} not found for subscription ${subscription.transactionRef}`);
      }
    } else {
      // ─── Failure path ────────────────────────────────────────
      subscription.status = 'cancelled';
      subscription.paymentStatus = 'failed';
      subscription.metadata = {
        ...subscription.metadata,
        failedAt: new Date(),
        failureStatus: status,
        callbackPayload: payload
      };
      await subscription.save();
      console.log(`❌ Payment failed for ${subscription.transactionRef}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Payment callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// ─── POST /api/subscriptions/intasend-webhook (Legacy) ─────────
router.post('/intasend-webhook', async (req, res) => {
  console.log('📥 Legacy webhook (intasend-webhook) — ignoring.');
  res.status(200).send('OK');
});

// ─── POST /api/subscriptions/verify-payment ────────────────────
// SAFE version: queries the payment proxy for the real status.
// Does NOT activate on user-supplied receipt alone.
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { transactionRef } = req.body;
    if (!transactionRef) {
      return res.status(400).json({ error: 'Transaction reference required' });
    }

    const subscription = await Subscription.findOne({
      transactionRef,
      userId: req.user._id
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Already handled — idempotent response
    if (subscription.status === 'active') {
      return res.json({
        success: true,
        message: 'Subscription is already active.',
        status: 'active'
      });
    }

    if (subscription.status !== 'pending') {
      return res.status(400).json({
        error: `Subscription is in "${subscription.status}" state — cannot verify.`
      });
    }

    // ─── Query the payment proxy for authoritative status ──────
    const intasendServiceUrl =
      process.env.INTASEND_SERVICE_URL || 'https://sarahapay-intasend.onrender.com';

    let remoteStatus = null;
    let remoteReceipt = null;

    try {
      const lookupRef = subscription.metadata?.api_ref || transactionRef;
      const statusRes = await axios.get(
        `${intasendServiceUrl}/api/status/${encodeURIComponent(lookupRef)}`,
        {
          headers: { 'x-api-secret': process.env.API_SECRET },
          timeout: 10000
        }
      );
      remoteStatus = String(statusRes.data?.status || '').toLowerCase();
      remoteReceipt = statusRes.data?.mpesaReceipt || statusRes.data?.mpesa_receipt || null;
      console.log(`🔎 Remote status for ${lookupRef}: ${remoteStatus}`);
    } catch (err) {
      console.warn('⚠️  Proxy status lookup failed:', err.message);
      return res.status(503).json({
        error: 'Could not reach payment provider. Please wait for the payment to auto-confirm.'
      });
    }

    // ─── Only activate if the provider confirms success ────────
    if (remoteStatus === 'complete' || remoteStatus === 'completed' || remoteStatus === 'success') {
      subscription.status = 'active';
      subscription.paymentStatus = 'paid';
      subscription.metadata = {
        ...subscription.metadata,
        mpesaReceipt: remoteReceipt,
        verifiedAt: new Date(),
        verifiedBy: 'manual-status-query'
      };
      await subscription.save();

      const user = await User.findById(subscription.userId);
      if (user) {
        const durationDays = subscription.metadata?.durationDays || 30;
        const currentExpiry = user.subscriptionExpiry
          ? new Date(user.subscriptionExpiry)
          : null;
        const now = new Date();

        const newExpiry =
          currentExpiry && currentExpiry > now
            ? new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        user.subscriptionPlan = subscription.plan;
        user.subscriptionExpiry = newExpiry;
        await user.save();

        await Property.updateMany(
          { ownerId: user._id },
          { $set: { ownerSubscriptionPlan: subscription.plan } }
        );

        console.log(
          `✅ User ${user.email} activated via manual query ` +
          `(expiry: ${newExpiry.toISOString()})`
        );

        try {
          await sendSubscriptionConfirmationEmail(
            user.email,
            user.name,
            subscription.plan,
            subscription.amount
          );
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }

      return res.json({
        success: true,
        message: 'Subscription verified and activated.',
        status: 'active',
        subscription
      });
    }

    // Status query came back, but not confirmed yet
    return res.status(202).json({
      success: false,
      status: remoteStatus || 'pending',
      message: 'Payment is still being processed. We will activate your account once M-PESA confirms.'
    });
  } catch (error) {
    console.error('Manual verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── GET /api/subscriptions/status ─────────────────────────────
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
        daysRemaining:
          isActive && user.subscriptionExpiry
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(user.subscriptionExpiry) - new Date()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0
      }
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// ─── GET /api/subscriptions/check-expiry ───────────────────────
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
      const daysRemaining = Math.ceil(
        (user.subscriptionExpiry - now) / (1000 * 60 * 60 * 24)
      );
      if (daysRemaining === 3) {
        try {
          await sendRenewalReminderEmail(
            user.email,
            user.name,
            user.subscriptionPlan,
            daysRemaining
          );
          user.lastReminderSent = now;
          await user.save();
          reminderCount++;
        } catch (err) {
          console.error(`❌ Reminder failed for ${user.email}:`, err.message);
        }
      }
    }

    // ─── Users expired today ───────────────────────────────────
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