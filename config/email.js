// config/email.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@rentspace.co.ke';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://rentspace.co.ke';

// ─── Plan display name mapping ──────────────────────────────
const PLAN_DISPLAY = {
  free: 'Bronze',
  basic: 'Silver',
  pro: 'Gold',
  developer: 'Platinum'
};

/**
 * Send a verification email to a new user
 */
async function sendVerificationEmail(to, name, token) {
  const verificationLink = `${FRONTEND_URL}/verify-email.html?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `RentSpace <${FROM_EMAIL}>`,
      to: [to],
      subject: 'Verify your RentSpace account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
          <style>
            body { font-family: 'Jost', sans-serif; background-color: #0d0d0d; color: #eaeaea; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #2c2c2c; }
            .logo { color: #c5a059; font-size: 24px; font-weight: 700; text-align: center; }
            .logo span { color: #eaeaea; }
            h2 { color: #c5a059; text-align: center; }
            p { color: #aaa; line-height: 1.6; }
            .btn { display: inline-block; background: #c5a059; color: #0d0d0d; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .footer { text-align: center; color: #555; font-size: 12px; margin-top: 20px; border-top: 1px solid #2c2c2c; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Rent<span>Space</span></div>
            <h2>Welcome to RentSpace!</h2>
            <p>Hi ${name},</p>
            <p>Thanks for creating an account with RentSpace. To get started, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;"><a href="${verificationLink}" class="btn">Verify Email</a></p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
            <p>This link expires in 24 hours.</p>
            <div class="footer">
              <p>&copy; 2026 RentSpace Kenya. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error };
    }

    console.log(`✅ Verification email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * Send a password reset email
 */
async function sendPasswordResetEmail(to, name, token) {
  const resetLink = `${FRONTEND_URL}/reset-password.html?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `RentSpace <${FROM_EMAIL}>`,
      to: [to],
      subject: 'Reset your RentSpace password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Reset Password</title>
          <style>
            body { font-family: 'Jost', sans-serif; background-color: #0d0d0d; color: #eaeaea; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #2c2c2c; }
            .logo { color: #c5a059; font-size: 24px; font-weight: 700; text-align: center; }
            .logo span { color: #eaeaea; }
            h2 { color: #c5a059; text-align: center; }
            p { color: #aaa; line-height: 1.6; }
            .btn { display: inline-block; background: #c5a059; color: #0d0d0d; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .footer { text-align: center; color: #555; font-size: 12px; margin-top: 20px; border-top: 1px solid #2c2c2c; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Rent<span>Space</span></div>
            <h2>Reset Your Password</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your RentSpace password. Click the button below to set a new password:</p>
            <p style="text-align: center;"><a href="${resetLink}" class="btn">Reset Password</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>This link expires in 1 hour.</p>
            <div class="footer">
              <p>&copy; 2026 RentSpace Kenya. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error };
    }

    console.log(`✅ Password reset email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * Send a subscription confirmation email
 */
async function sendSubscriptionConfirmationEmail(to, name, plan, amount) {
  const displayName = PLAN_DISPLAY[plan] || plan;

  try {
    const { data, error } = await resend.emails.send({
      from: `RentSpace <${FROM_EMAIL}>`,
      to: [to],
      subject: `Subscription Confirmed – ${displayName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Subscription Confirmed</title>
          <style>
            body { font-family: 'Jost', sans-serif; background-color: #0d0d0d; color: #eaeaea; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #2c2c2c; }
            .logo { color: #c5a059; font-size: 24px; font-weight: 700; text-align: center; }
            .logo span { color: #eaeaea; }
            h2 { color: #c5a059; text-align: center; }
            p { color: #aaa; line-height: 1.6; }
            .plan { background: #0d0d0d; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #c5a059; }
            .footer { text-align: center; color: #555; font-size: 12px; margin-top: 20px; border-top: 1px solid #2c2c2c; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Rent<span>Space</span></div>
            <h2>Subscription Confirmed! 🎉</h2>
            <p>Hi ${name},</p>
            <p>Your subscription to the <strong>${displayName}</strong> plan has been successfully activated.</p>
            <div class="plan">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #c5a059;">${displayName}</p>
              <p style="margin: 0; color: #888;">KES ${amount} / month</p>
            </div>
            <p>You can now list properties on RentSpace and reach thousands of potential tenants.</p>
            <p><a href="${FRONTEND_URL}/dashboard.html" style="color: #c5a059;">Go to Dashboard →</a></p>
            <div class="footer">
              <p>&copy; 2026 RentSpace Kenya. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error };
    }

    console.log(`✅ Subscription confirmation email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}

// =============================================================
// 📧 SUBSCRIPTION REMINDER EMAILS
// =============================================================

/**
 * Send a renewal reminder email (3 days before expiry)
 */
async function sendRenewalReminderEmail(to, name, plan, daysRemaining) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not set. Skipping email.');
    return { success: false, error: 'RESEND_API_KEY not set' };
  }

  const displayName = PLAN_DISPLAY[plan] || plan;

  try {
    const { data, error } = await resend.emails.send({
      from: `RentSpace <${FROM_EMAIL}>`,
      to: [to],
      subject: `⏳ Your ${displayName} plan expires in ${daysRemaining} days`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Renew Your Subscription</title>
          <style>
            body { font-family: 'Jost', sans-serif; background-color: #0d0d0d; color: #eaeaea; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #2c2c2c; }
            .logo { color: #c5a059; font-size: 24px; font-weight: 700; text-align: center; }
            .logo span { color: #eaeaea; }
            h2 { color: #ffc107; text-align: center; }
            p { color: #aaa; line-height: 1.6; }
            .btn { display: inline-block; background: #c5a059; color: #0d0d0d; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .footer { text-align: center; color: #555; font-size: 12px; margin-top: 20px; border-top: 1px solid #2c2c2c; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Rent<span>Space</span></div>
            <h2>⏳ Renew Your Subscription</h2>
            <p>Hi ${name || 'User'},</p>
            <p>Your <strong style="color: #c5a059;">${displayName}</strong> plan will expire in <strong style="color: #ffc107;">${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>.</p>
            <p>Renew now to keep your listings live and maintain your premium visibility.</p>
            <p style="text-align: center;"><a href="${FRONTEND_URL}/dashboard.html" class="btn">Renew Now</a></p>
            <p style="font-size: 13px; color: #888;">If you've already renewed, please ignore this email.</p>
            <div class="footer">
              <p>&copy; 2026 RentSpace Kenya. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error };
    }

    console.log(`✅ Renewal reminder sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send reminder email:', error);
    return { success: false, error };
  }
}

/**
 * Send an expired subscription email (downgrade notification)
 */
async function sendExpiredEmail(to, name, previousPlan) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not set. Skipping email.');
    return { success: false, error: 'RESEND_API_KEY not set' };
  }

  const displayName = PLAN_DISPLAY[previousPlan] || previousPlan;

  try {
    const { data, error } = await resend.emails.send({
      from: `RentSpace <${FROM_EMAIL}>`,
      to: [to],
      subject: `⚠️ Your ${displayName} plan has expired`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Subscription Expired</title>
          <style>
            body { font-family: 'Jost', sans-serif; background-color: #0d0d0d; color: #eaeaea; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #2c2c2c; }
            .logo { color: #c5a059; font-size: 24px; font-weight: 700; text-align: center; }
            .logo span { color: #eaeaea; }
            h2 { color: #ff6b6b; text-align: center; }
            p { color: #aaa; line-height: 1.6; }
            .btn { display: inline-block; background: #c5a059; color: #0d0d0d; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .footer { text-align: center; color: #555; font-size: 12px; margin-top: 20px; border-top: 1px solid #2c2c2c; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Rent<span>Space</span></div>
            <h2>⚠️ Subscription Expired</h2>
            <p>Hi ${name || 'User'},</p>
            <p>Your <strong style="color: #ff6b6b;">${displayName}</strong> plan has expired.</p>
            <p>Your listings have been set to <strong>Bronze</strong> visibility and you can no longer add new properties.</p>
            <p>Reactivate your subscription to restore premium features and keep your listings visible.</p>
            <p style="text-align: center;"><a href="${FRONTEND_URL}/dashboard.html" class="btn">Reactivate Now</a></p>
            <p style="font-size: 13px; color: #888;">If you've already renewed, please ignore this email.</p>
            <div class="footer">
              <p>&copy; 2026 RentSpace Kenya. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error };
    }

    console.log(`✅ Expired email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send expired email:', error);
    return { success: false, error };
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionConfirmationEmail,
  sendRenewalReminderEmail,   // ✅ NEW
  sendExpiredEmail            // ✅ NEW
};