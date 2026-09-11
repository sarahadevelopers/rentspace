// config/passport.js
// Google OAuth 2.0 strategy for Passport
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      if (!email) {
        return done(new Error('No email found in Google profile'), null);
      }

      // 1. Look for existing user by email
      let user = await User.findOne({ email });

      if (user) {
        // If found, ensure verified + return
        if (!user.verified) {
          user.verified = true;
          await user.save();
        }
        return done(null, user);
      }

      // 2. Create new user (Google provides name, email but no phone)
      // Generate a unique placeholder phone to satisfy the unique constraint
      const placeholderPhone = `google_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      user = await User.create({
        name: profile.displayName || 'Google User',
        email: email,
        phone: placeholderPhone,
        password: crypto.randomBytes(16).toString('hex'), // random, unused
        role: 'customer',
        verified: true,
        trialStartDate: new Date(),
        subscriptionPlan: 'free'
      });

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;