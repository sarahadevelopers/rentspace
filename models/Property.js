const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // ─── Owner ──────────────────────────────────────────────────
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ─── Basic Info ─────────────────────────────────────────────
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  listingType: {
    type: String,
    enum: ['sale', 'rent', 'short_term', 'long_term'],
    required: true,
    default: 'sale'
  },
  propertyType: {
    type: String,
    default: 'apartment'
  },

  // ─── Location ───────────────────────────────────────────────
  estate: {
    type: String,
    required: true
  },
  county: {
    type: String,
    default: 'Nairobi'
  },

  // ─── Pricing & Specs ────────────────────────────────────────
  price: {
    type: Number,
    required: true
  },
  priceNight: Number,                // for short‑stay
  bedrooms: Number,
  bathrooms: Number,
  parking: Number,
  sqft: Number,
  size: String,                      // e.g., "1/8 acre"

  // ─── Description & Media ──────────────────────────────────
  description: {
    type: String,
    required: true
  },
  images: [String],
  amenities: [String],

  // ─── Status & Metadata ────────────────────────────────────
  status: {
    type: String,
    enum: [
      'draft',
      'pending',
      'approved',
      'rejected',
      'published',
      'rented',
      'expired',
      'archived',
      'available',   // ✅ Added
      'sold',        // ✅ Added
      'reserved'     // ✅ Added
    ],
    default: 'pending'
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  // ─── Lead tracking ──────────────────────────────────────────
  leadCount: {
    type: Number,
    default: 0
  },
  contactHidden: {
    type: Boolean,
    default: false
  },

  // ─── Availability (for filtering) ──────────────────────────
  available_for: {
    type: String,
    enum: ['long_term', 'short_term', 'both', 'sale'],
    default: 'long_term'
  },
  rental_type: {
    type: String,
    enum: ['long_term', 'short_term', 'sale'],
    default: 'long_term'
  },
  isAirbnb: {
    type: Boolean,
    default: false
  },

  // ⭐ NEW: Subscription plan of the owner (for ranking)
  ownerSubscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'developer'],
    default: 'free'
  },

  // ─── Auto-expiry ────────────────────────────────────────────
  expiresAt: {
    type: Date,
    default: null
  },

  // ─── Timestamps ─────────────────────────────────────────────
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ─── Indexes for performance ──────────────────────────────────
propertySchema.index({ featured: -1, ownerSubscriptionPlan: 1, createdAt: -1 });
propertySchema.index({ ownerId: 1, status: 1 }); // For listing limit queries
propertySchema.index({ slug: 1 });
propertySchema.index({ status: 1, expiresAt: 1 }); // For expiry cleanup

// ─── Pre‑save hook ─────────────────────────────────────────────
propertySchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

// ─── Pre‑save: auto-set expiresAt for free listings ──────────
propertySchema.pre('save', async function() {
  if (this.isNew && this.ownerSubscriptionPlan === 'free') {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
});

module.exports = mongoose.model('Property', propertySchema);