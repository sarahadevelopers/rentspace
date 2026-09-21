// middleware/recaptcha.js
// Verifies Google reCAPTCHA v3 tokens against the siteverify API.
// No external package — uses axios (already a dependency).

const axios = require('axios');

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Default thresholds per action. Higher = stricter.
const ACTION_THRESHOLDS = {
  signup:  0.5,
  login:   0.5,
  payment: 0.7,   // stricter — real money involved
  contact: 0.5,
  default: 0.5
};

/**
 * Returns an Express middleware that verifies a reCAPTCHA v3 token.
 * The token is expected in req.body.recaptchaToken.
 * The action name is passed as an argument to the middleware.
 *
 * @param {string} expectedAction - 'signup' | 'login' | 'payment' | ...
 */
function verifyRecaptcha(expectedAction = 'default') {
  return async (req, res, next) => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    // If no secret configured, skip verification but log loudly.
    // This lets you deploy without breaking, then enable once tested.
    if (!secret) {
      console.warn(`⚠️  reCAPTCHA skipped for "${expectedAction}" — RECAPTCHA_SECRET_KEY not set.`);
      return next();
    }

    const token = req.body?.recaptchaToken || req.body?.['g-recaptcha-response'];

    if (!token) {
      console.warn(`🚫 reCAPTCHA: missing token for "${expectedAction}" from ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: 'reCAPTCHA verification required. Please reload and try again.'
      });
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', secret);
      params.append('response', token);

      const { data } = await axios.post(SITEVERIFY_URL, params, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (!data.success) {
        console.warn(`🚫 reCAPTCHA failed (${expectedAction}):`, data['error-codes']);
        return res.status(400).json({
          success: false,
          error: 'reCAPTCHA verification failed. Please reload and try again.'
        });
      }

      // Google returns the action name for v3 tokens
      if (data.action && data.action !== expectedAction) {
        console.warn(`🚫 reCAPTCHA action mismatch: expected "${expectedAction}", got "${data.action}"`);
        return res.status(400).json({
          success: false,
          error: 'reCAPTCHA verification failed.'
        });
      }

      const score = data.score ?? 0;
      const threshold = ACTION_THRESHOLDS[expectedAction] ?? ACTION_THRESHOLDS.default;

      if (score < threshold) {
        console.warn(`🚫 reCAPTCHA low score for "${expectedAction}": ${score} (need ${threshold}) from ${req.ip}`);
        return res.status(403).json({
          success: false,
          error: 'Your request was flagged as suspicious. Please try again later.'
        });
      }

      // Attach score + hostname for logging downstream
      req.recaptcha = {
        score,
        action: data.action,
        hostname: data.hostname,
        challengeTs: data.challenge_ts
      };

      console.log(`✅ reCAPTCHA passed: action=${expectedAction} score=${score} ip=${req.ip}`);
      return next();

    } catch (err) {
      // Network or timeout — fail OPEN (don't block users if Google is unreachable)
      // This is a design choice: better a bot sneaks through than a user is blocked.
      console.error('❌ reCAPTCHA verify error:', err.message);
      return next();
    }
  };
}

module.exports = { verifyRecaptcha };