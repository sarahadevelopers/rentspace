const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
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
  excerpt: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General'
  },
  tags: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    default: '' // Featured image URL
  },
  date: {
    type: Date,
    default: Date.now
  },
  readTime: {
    type: String,
    default: '3 min read'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  metaDescription: {
    type: String,
    default: ''
  },
  metaKeywords: {
    type: String,
    default: ''
  },
  views: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// ─── Indexes for performance ──────────────────────────────────
postSchema.index({ slug: 1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });

// ─── Pre‑save: auto-generate slug ────────────────────────────
postSchema.pre('save', async function() {
  if (this.isModified('title') && !this.slug) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;
    let existing = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
    while (existing) {
      slug = `${baseSlug}-${counter}`;
      existing = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
      counter++;
    }
    this.slug = slug;
  }
});

module.exports = mongoose.model('Post', postSchema);