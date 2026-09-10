const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Property = require('../models/Property');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── Cloudinary Configuration ──────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─── Multer Storage ────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rentspace/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ─── Helper: generate unique slug ─────────────────────────────
async function generateUniqueSlug(title, existingId = null) {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  let slug = baseSlug;
  let counter = 1;
  let existing = await Property.findOne({ slug, _id: { $ne: existingId } });
  while (existing) {
    slug = `${baseSlug}-${counter}`;
    existing = await Property.findOne({ slug, _id: { $ne: existingId } });
    counter++;
  }
  return slug;
}

// ─── Helper: check if subscription is active ──────────────────
function isSubscriptionActive(user) {
  if (!user) return false;
  const plan = user.subscriptionPlan || 'free';
  const expiry = user.subscriptionExpiry;

  if (plan === 'free') {
    const trialStart = user.createdAt || user.trialStartDate;
    if (!trialStart) return false;
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 30);
    return new Date() < trialEnd;
  }

  if (['basic', 'pro', 'developer'].includes(plan)) {
    if (!expiry) return false;
    return new Date(expiry) > new Date();
  }

  return false;
}

// ─── Helper: get listing limit ─────────────────────────────────
function getListingLimit(user) {
  const plan = user.subscriptionPlan || 'free';
  const limits = { free: 2, basic: 20, pro: Infinity, developer: Infinity };
  return limits[plan] || 2;
}

// ─── Helper: build expiry filter ───────────────────────────────
// Returns a MongoDB query fragment that excludes expired listings
function buildExpiryFilter() {
  const now = new Date();
  return {
    $or: [
      { expiresAt: null },              // legacy listings without expiry
      { expiresAt: { $gt: now } }       // not yet expired
    ]
  };
}

// =================================================================
// CRON ENDPOINT — Auto-expire listings past their expiresAt
// Protected by CRON_SECRET
// =================================================================
router.get('/check-expiry', async (req, res) => {
  try {
    // Security check
    if (req.query.secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();

    // ── 1. Expire active listings past their expiresAt ─────────
    const expiredResult = await Property.updateMany(
      {
        status: { $in: ['approved', 'published', 'available'] },
        expiresAt: { $ne: null, $lt: now }
      },
      {
        $set: { status: 'expired', updatedAt: now }
      }
    );

    // ── 2. Optionally archive very old expired listings (30+ days) ─
    const archiveCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const archivedResult = await Property.updateMany(
      {
        status: 'expired',
        expiresAt: { $ne: null, $lt: archiveCutoff }
      },
      {
        $set: { status: 'archived', updatedAt: now }
      }
    );

    console.log(`🕒 Listing expiry cron: ${expiredResult.nModified} expired, ${archivedResult.nModified} archived`);

    res.json({
      success: true,
      expiredListings: expiredResult.nModified,
      archivedListings: archivedResult.nModified,
      checkedAt: now.toISOString()
    });
  } catch (error) {
    console.error('❌ Listing expiry cron error:', error);
    res.status(500).json({ success: false, error: 'Cron job failed' });
  }
});

// ─── GET /api/properties (public) ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      estate, minPrice, maxPrice, type, bedrooms, bathrooms, featured,
      listingType, propertyType,
      page = 1, limit = 20
    } = req.query;

    // ✅ Base query: only approved AND not expired
    const query = {
      status: 'approved',
      ...buildExpiryFilter()
    };

    if (estate) query.estate = estate;
    if (type) query.listingType = type;
    if (listingType) query.listingType = listingType;
    if (propertyType) query.propertyType = propertyType;
    if (featured === 'true') query.featured = true;
    if (bedrooms) query.bedrooms = parseInt(bedrooms);
    if (bathrooms) query.bathrooms = parseInt(bathrooms);

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let properties = await Property.find(query)
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Property.countDocuments(query);

    // ── Enrich with owner details ──────────────────────────────
    const ownerIds = properties.map(p => p.ownerId).filter(id => id);
    const owners = await User.find({ _id: { $in: ownerIds } })
      .select('_id phone email name subscriptionPlan subscriptionExpiry createdAt');

    const ownerMap = {};
    owners.forEach(u => { ownerMap[u._id.toString()] = u; });

    properties = properties.map(p => {
      const owner = p.ownerId ? ownerMap[p.ownerId.toString()] : null;

      if (!owner) {
        return { ...p, contactHidden: true, contactMessage: 'Owner details unavailable' };
      }

      const isActive = isSubscriptionActive(owner);
      const isFree = (owner.subscriptionPlan || 'free') === 'free';
      const hideContact = !isActive || (isFree && !isSubscriptionActive(owner));

      const property = { ...p };
      const planPriority = { developer: 4, pro: 3, basic: 2, free: 1 };
      property._priority = planPriority[owner.subscriptionPlan] || 0;

      if (hideContact) {
        delete property.phone;
        delete property.email;
        delete property.whatsapp;
        property.contactHidden = true;
        property.contactMessage = 'Contact details hidden. Please login or upgrade to view.';
      } else {
        property.phone = owner.phone || property.phone;
        property.email = owner.email || property.email;
        property.ownerName = owner.name || property.ownerName;
      }

      return property;
    });

    properties.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b._priority || 0) - (a._priority || 0);
    });

    properties = properties.map(p => {
      const { _priority, ...rest } = p;
      return rest;
    });

    res.json({
      success: true,
      count: properties.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      properties
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching properties',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ─── GET /api/properties/my-properties (authenticated) ────────
router.get('/my-properties', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, includeExpired } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (req.user.role !== 'admin') {
      query = { ownerId: req.user._id };
    }

    // Owners can see their own expired listings unless explicitly excluded
    // (Admins see everything)

    const [properties, total] = await Promise.all([
      Property.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean(),
      Property.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: properties.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      properties
    });
  } catch (error) {
    console.error('Error fetching user properties:', error);
    res.status(500).json({ success: false, error: 'Server error fetching your properties' });
  }
});

// ─── GET /api/properties/:slug (public) ────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const now = new Date();
    const property = await Property.findOne({
      slug: req.params.slug,
      ...buildExpiryFilter()   // ✅ Blocks expired listings
    }).lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found or has expired'
      });
    }

    Property.updateOne({ _id: property._id }, { $inc: { views: 1 } }).exec();

    if (property.ownerId) {
      const owner = await User.findById(property.ownerId)
        .select('_id phone email name subscriptionPlan subscriptionExpiry createdAt');
      if (owner) {
        const isActive = isSubscriptionActive(owner);
        const isFree = (owner.subscriptionPlan || 'free') === 'free';
        const hideContact = !isActive || (isFree && !isSubscriptionActive(owner));

        if (hideContact) {
          delete property.phone;
          delete property.email;
          delete property.whatsapp;
          property.contactHidden = true;
          property.contactMessage = 'Contact details hidden. Please login or upgrade to view.';
        } else {
          property.phone = owner.phone || property.phone;
          property.email = owner.email || property.email;
          property.ownerName = owner.name || property.ownerName;
        }
      }
    }

    res.json({ success: true, property });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ success: false, error: 'Server error fetching property' });
  }
});

// ─── POST /api/properties (authenticated) ─────────────────────
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    console.log('📥 Incoming property data:', req.body);
    console.log('👤 User plan:', req.user.subscriptionPlan, '| expiry:', req.user.subscriptionExpiry);

    const {
      title, listingType, estate, county, price,
      bedrooms, bathrooms, parking, sqft, description, amenities,
      propertyType, size, status, available_for, rental_type
    } = req.body;

    if (!title || !listingType || !estate || !price || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, listingType, estate, price, description'
      });
    }

    // ── Subscription + listing limit check ────────────────────
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const isActive = isSubscriptionActive(req.user);
      if (!isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your subscription has expired or trial ended. Please upgrade to list properties.'
        });
      }

      const maxListings = getListingLimit(req.user);
      const currentListings = await Property.countDocuments({
        ownerId: req.user._id,
        status: { $nin: ['archived', 'expired'] }   // ✅ Don't count expired as active
      });

      if (currentListings >= maxListings) {
        return res.status(403).json({
          success: false,
          error: `You have reached your plan's listing limit (${maxListings === Infinity ? 'unlimited' : maxListings}). Please upgrade to add more properties.`
        });
      }
    }

    const slug = await generateUniqueSlug(title);
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    let amenitiesArray = [];
    if (amenities) {
      try {
        amenitiesArray = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
      } catch (e) { amenitiesArray = []; }
    }

    // ── Compute expiresAt ─────────────────────────────────────
    // Free users: 30 days from now
    // Paid users: tied to subscription expiry (or null if admin)
    const plan = req.user.subscriptionPlan || 'free';
    let expiresAt = null;

    if (plan === 'free') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (req.user.subscriptionExpiry) {
      expiresAt = new Date(req.user.subscriptionExpiry);
    }
    // Admins get no expiry (null)

    const propertyData = {
      ownerId: req.user._id,
      title, slug, listingType, estate,
      county: county || 'Nairobi',
      price: parseFloat(price),
      bedrooms: bedrooms ? parseInt(bedrooms) : 0,
      bathrooms: bathrooms ? parseInt(bathrooms) : 0,
      parking: parking ? parseInt(parking) : 0,
      sqft: sqft ? parseFloat(sqft) : 0,
      description,
      images: imageUrls,
      amenities: amenitiesArray,
      propertyType: propertyType || 'apartment',
      status: status || 'pending',
      available_for: available_for || '',
      rental_type: rental_type || '',
      ownerSubscriptionPlan: plan,
      expiresAt                          // ✅ Set here explicitly
    };

    console.log('📦 Property data to save:', { ...propertyData, expiresAt });

    const property = await Property.create(propertyData);
    res.status(201).json({ success: true, property });
  } catch (error) {
    console.error('❌ Property creation error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message, fields: Object.keys(error.errors) });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Duplicate property (slug already exists)' });
    }
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      success: false,
      error: isProduction ? 'Server error creating property.' : error.message,
      ...(isProduction ? {} : { stack: error.stack })
    });
  }
});

// ─── PUT /api/properties/:id (authenticated) ──────────────────
router.put('/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this property' });
    }

    const updateData = { ...req.body };

    // ── Handle images ─────────────────────────────────────────
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = typeof req.body.existingImages === 'string'
          ? JSON.parse(req.body.existingImages)
          : req.body.existingImages;
      } catch (e) { existingImages = []; }
    }

    const newImageUrls = req.files ? req.files.map(file => file.path) : [];
    let finalImages = existingImages.length > 0 ? existingImages : property.images || [];
    if (newImageUrls.length > 0) {
      finalImages = [...finalImages, ...newImageUrls];
    }
    updateData.images = finalImages;

    // ── Regenerate slug if title changed ──────────────────────
    if (req.body.title && req.body.title !== property.title) {
      updateData.slug = await generateUniqueSlug(req.body.title, property._id);
    }

    // ── Extend expiry when editing (gives renewed 30-day window) ─
    if (updateData.extendExpiry === 'true' || property.status === 'expired') {
      const plan = property.ownerSubscriptionPlan || 'free';
      if (plan === 'free') {
        updateData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      // Also reset status if it was expired
      if (property.status === 'expired' && updateData.status === undefined) {
        updateData.status = 'pending';
      }
    }
    delete updateData.extendExpiry;

    // ── Remove protected fields ───────────────────────────────
    delete updateData._id;
    delete updateData.ownerId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.slug;
    delete updateData.existingImages;
    delete updateData.existingPublicIds;

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ success: true, property: updatedProperty });
  } catch (error) {
    console.error('Error updating property:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Server error updating property' });
  }
});

// ─── DELETE /api/properties/:id (authenticated) ───────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this property' });
    }

    property.status = 'archived';
    await property.save();

    res.json({ success: true, message: 'Property archived' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ success: false, error: 'Server error deleting property' });
  }
});

module.exports = router;