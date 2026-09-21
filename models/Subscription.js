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
    // 'superseded' is set when a newer pending sub replaces this one
    // (double-click / re-initiated renewal). 'refunded' reserved for future use.
    enum: ['pending', 'paid', 'failed', 'superseded', 'refunded'],
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
  phone: {                // stores the phone number used for payment
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
// `transactionRef` is declared at field level via `unique: true, sparse: true`.
// Do NOT re-add it here — that produces a duplicate-index warning on boot.
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, renewalDate: 1 });
subscriptionSchema.index({ phone: 1, status: 1 }); // webhook lookup by phone

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
      $set: { status: 'expired', expiredAt: now }
    }
  );
  return result;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);