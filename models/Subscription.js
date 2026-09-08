const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'developer'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  transactionRef: {
    type: String,
    unique: true,
    sparse: true
  },
  amount: {
    type: Number,
    required: true
  },
  phone: {                // ✅ NEW – stores the phone number used for payment
    type: String,
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  renewalDate: {
    type: Date
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  expiredAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: Object // Store IntaSend response, callback payload, etc.
  }
}, { timestamps: true });

// ─── Indexes for performance ──────────────────────────────────
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ transactionRef: 1 });
subscriptionSchema.index({ status: 1, renewalDate: 1 });
subscriptionSchema.index({ phone: 1, status: 1 }); // ✅ NEW – for webhook lookup by phone

// ─── Instance method: check if subscription is active ──────
subscriptionSchema.methods.isActive = function() {
  if (this.status !== 'active') return false;
  if (!this.renewalDate) return false;
  return new Date(this.renewalDate) > new Date();
};

// ─── Static method: expire past subscriptions ──────────────
subscriptionSchema.statics.expirePastSubscriptions = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'active',
      renewalDate: { $lt: now }
    },
    {
      status: 'expired',
      expiredAt: now
    }
  );
  return result;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);