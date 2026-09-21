const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'agent', 'landlord', 'admin'],
    default: 'customer'
  },
  verified: {
    type: Boolean,
    default: false // For "Verified Only" rule
  },
  verificationToken: {
    type: String,
    select: false
  },

  // ─── Subscription Fields ────────────────────────────────
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'developer'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  trialStartDate: {
    type: Date,
    default: Date.now // For 30-day trial tracking
  },

  // ─── Payment Receipt Tracking ──────────────────────────
  mpesaReceipt: {
    type: String,
    default: null
  },
  transactionRef: {
    type: String,
    default: null
  },

  // ─── Email Reminder Tracking ────────────────────────────
  lastReminderSent: {
    type: Date,
    default: null
  },
  expiredEmailSent: {
    type: Boolean,
    default: false
  },

  // ─── Reset Password ──────────────────────────────────────
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },

  // ─── Agent Profile (Optional) ───────────────────────────
  agentProfile: {
    companyName: { type: String },
    logo: { type: String },
    website: { type: String },
    bio: { type: String }
  }
}, { timestamps: true }); // Auto-updates `createdAt` and `updatedAt`

// ─── Encrypt password ──────────────────────────────────────
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Match password ────────────────────────────────────────
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Indexes for performance ──────────────────────────────
// `email` and `phone` indexes are declared at field level via `unique: true`.
// Do NOT re-add them here — that produces a duplicate-index warning on boot.
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);