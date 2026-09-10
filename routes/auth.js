const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Property = require('../models/Property');
const authMiddleware = require('../middleware/auth');
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendExpiredEmail   // ← ADD
} = require('../config/email');

const router = express.Router();

// ─── Rate Limiter for Auth Routes ──────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── JWT Token Generator ──────────────────────────────────────
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ─── Signup ────────────────────────────────────────────────────
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // ── 1. Validate required fields ────────────────────────────
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: 'All fields are required: name, email, phone, password'
      });
    }

    // ── 2. Check for existing user ─────────────────────────────
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with that email or phone'
      });
    }

    // ── 3. Generate verification token ──────────────────────────
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // ── 4. Create user ──────────────────────────────────────────
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'customer', // Default to customer
      verificationToken,
      verified: false,
      trialStartDate: new Date(), // For 30-day free trial
      subscriptionPlan: 'free'    // Start with free plan
    });

    // ── 5. Send verification email (non-blocking) ───────────────
    try {
      await sendVerificationEmail(email, name, verificationToken);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        verified: user.verified,
        trialStartDate: user.trialStartDate
      },
      requiresVerification: true
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: isProduction
        ? 'Server error during signup. Please try again later.'
        : error.message,
      ...(isProduction ? {} : { stack: error.stack })
    });
  }
});

// ─── Verify Email ──────────────────────────────────────────────
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    // ─── Return a response that can redirect to frontend ──────
    const frontendUrl = process.env.FRONTEND_URL || 'https://sarahadevelopers.github.io/rentspace-markeplace';
    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      redirect: `${frontendUrl}/login?verified=true`
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Login ────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ─── Check if email is verified ─────────────────────────────
    if (!user.verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        requiresVerification: true
      });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiry: user.subscriptionExpiry,
        verified: user.verified,
        trialStartDate: user.trialStartDate
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── Get Current User ────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Logout ────────────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  // Client-side: remove token from localStorage
  res.json({ success: true, message: 'Logged out successfully' });
});

// ─── Delete Account ──────────────────────────────────────────
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET all users (admin only) ──────────────────────────────
router.get('/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Update user role (admin only) ────────────────────────────
router.put('/users/:id/role', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { role } = req.body;
    if (!['customer', 'agent', 'landlord', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================================
// 🔐 PASSWORD RESET ENDPOINTS
// =============================================================

// ─── Request Password Reset ──────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Security: don't reveal if email exists
      return res.status(200).json({
        message: 'If that email is registered, you will receive a reset link.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    try {
      await sendPasswordResetEmail(email, user.name, resetToken);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
    }

    res.status(200).json({
      message: 'If that email is registered, you will receive a reset link.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error processing request' });
  }
});

// ─── Verify Reset Token ──────────────────────────────────────
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired token' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Reset Password ──────────────────────────────────────────
// ─── Reset Password ──────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================================
// 🔐 SUBSCRIPTION DOWNGRADE (Auto-downgrade expired users)
// =============================================================

// ─── POST /api/auth/downgrade-expired ──────────────────────────
// ─── POST /api/auth/downgrade-expired ──────────────────────────
router.post('/downgrade-expired', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only downgrade if expired
   // ─── Already free? Nothing to downgrade ──────────────────────
if (user.subscriptionPlan === 'free') {
  return res.status(400).json({ error: 'User is already on the free plan' });
}

// ─── Still active? Don't downgrade ───────────────────────────
if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date()) {
  return res.status(400).json({ error: 'Subscription is still active' });
}

    // ─── Downgrade user ──────────────────────────────────────────
    const previousPlan = user.subscriptionPlan;
    user.subscriptionPlan = 'free';
    user.subscriptionExpiry = null;
    await user.save();

    // ─── Update all properties ──────────────────────────────────
    // ─── Update all properties (downgrade plan + expire listings) ──
const now = new Date();
await Property.updateMany(
  { ownerId: user._id, status: { $in: ['approved', 'published', 'available'] } },
  {
    $set: {
      ownerSubscriptionPlan: 'free',
      status: 'expired',
      expiresAt: now,
      updatedAt: now
    }
  }
);

// Keep archived/rejected listings untouched but update their plan
await Property.updateMany(
  { ownerId: user._id, status: { $nin: ['approved', 'published', 'available'] } },
  { $set: { ownerSubscriptionPlan: 'free' } }
);

    console.log(`✅ User ${user.email} auto-downgraded from ${previousPlan} to free (expired)`);

    // ─── Send expired email notification ──────────────────────
    try {
      await sendExpiredEmail(user.email, user.name, previousPlan);
      console.log(`✅ Expired email sent to ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send expired email:', emailError);
    }

    res.json({
  success: true,
  message: 'Subscription expired. Downgraded to free plan. Active listings have been expired.',
  previousPlan,
  listingsExpired: true
});
  } catch (error) {
    console.error('Downgrade error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;