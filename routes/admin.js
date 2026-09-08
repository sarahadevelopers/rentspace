// routes/admin.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Property = require('../models/Property');
const Subscription = require('../models/Subscription');

// ─── Admin middleware ────────────────────────────────────────────
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ─── Apply auth + admin middleware to all routes ────────────────
router.use(authMiddleware, adminMiddleware);

// ─── GET /api/admin/stats ────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProperties = await Property.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const pendingSubscriptions = await Subscription.countDocuments({ status: 'pending' });

    // Total revenue from all paid subscriptions
    const revenueAgg = await Subscription.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // Recent activity (last 5 subscriptions)
    const recentSubscriptions = await Subscription.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProperties,
        activeSubscriptions,
        pendingSubscriptions,
        totalRevenue
      },
      recentSubscriptions
    });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// ─── GET /api/admin/subscriptions ────────────────────────────────
router.get('/subscriptions', async (req, res) => {
  try {
    const { status, plan, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (status) query.status = status;
    if (plan) query.plan = plan;

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Admin subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// ─── GET /api/admin/properties ───────────────────────────────────
router.get('/properties', async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (status) query.status = status;

    const properties = await Property.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      data: properties,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Admin properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// ─── GET /api/admin/users ────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;