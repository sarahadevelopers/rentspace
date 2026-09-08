const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  let token;

  // ─── Extract token from Authorization header ────────────────
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // ─── Optionally extract from cookies ────────────────────────
  // if (!token && req.cookies?.token) token = req.cookies.token;

  // ─── Check if token exists ───────────────────────────────────
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token provided'
    });
  }

  try {
    // ─── Verify JWT ────────────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ─── Fetch user from database ──────────────────────────────
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // ─── Check if user account is active ──────────────────────
    // (Add a `status` or `isActive` field to User schema if needed)
    // if (user.status === 'blocked') {
    //   return res.status(401).json({
    //     success: false,
    //     error: 'Account has been deactivated'
    //   });
    // }

    // ─── Attach user to request ────────────────────────────────
    req.user = user;

    // ─── (Optional) Update last active timestamp ───────────────
    // User.updateOne({ _id: user._id }, { lastActiveAt: new Date() }).exec();

    next();

  } catch (error) {
    // ─── Handle specific JWT errors ────────────────────────────
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please log in again.',
        expired: true
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please log in again.'
      });
    }

    // ─── Generic error ──────────────────────────────────────────
    console.error('Auth middleware error:', {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    return res.status(401).json({
      success: false,
      error: 'Not authorized, token verification failed'
    });
  }
};