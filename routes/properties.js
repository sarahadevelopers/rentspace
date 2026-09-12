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
    transformation: [
      {
        width: 1200,
        height: 900,
        crop: 'limit',
        quality: 'auto:eco',
        fetch_format: 'auto'
      }
    ]
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

// ─── Input Limits (centralised constants) ─────────────────────
const LIMITS = {
  TITLE_MAX: 150,
  DESCRIPTION_MIN: 20,
  DESCRIPTION_MAX: 5000,
  ESTATE_MAX: 100,
  COUNTY_MAX: 50,
  SIZE_MAX: 100,
  AMENITIES_MAX_COUNT: 15,
  AMENITY_MAX_LENGTH: 100,
  AMENITIES_PAYLOAD_MAX: 10000,  // raw JSON string size
  IMAGES_MAX: 10,
  PRICE_MIN: 0,
  PRICE_MAX: 1000000000
};

// ─── Helper: validate numeric spec fields ─────────────────────
function parsePositiveInt(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parsePositiveFloat(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ─── Helper: validate & sanitize amenities ────────────────────
function sanitizeAmenities(rawAmenities) {
  if (!rawAmenities) return { ok: true, list: [] };

  // Check raw payload size first (before JSON.parse)
  if (typeof rawAmenities === 'string' && rawAmenities.length > LIMITS.AMENITIES_PAYLOAD_MAX) {
    return { ok: false, error: 'Amenities payload too large' };
  }

  let parsed = [];
  try {
    parsed = typeof rawAmenities === 'string' ? JSON.parse(rawAmenities) : rawAmenities;
  } catch (e) {
    return { ok: false, error: 'Amenities must be a valid JSON array' };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'Amenities must be an array' };
  }

  // Clean, dedupe, cap length
  const seen = new Set();
  const cleaned = [];
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().slice(0, LIMITS.AMENITY_MAX_LENGTH);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
    if (cleaned.length >= LIMITS.AMENITIES_MAX_COUNT) break;
  }

  return { ok: true, list: cleaned };
}

// ─── Helper: generate unique slug ─────────────────────────────
async function generateUniqueSlug(title, existingId = null) {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

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
  const limits = { free: 2, basic: 20, pro: 40, developer: Infinity };
  return limits[plan] || 2;
}

// ─── Helper: build expiry filter ───────────────────────────────
function buildExpiryFilter() {
  const now = new Date();
  return {
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ]
  };
}

// =================================================================
// CRON ENDPOINT — Auto-expire listings past their expiresAt
// =================================================================
router.get('/check-expiry', async (req, res) => {
  try {
    if (req.query.secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();

    const expiredResult = await Property.updateMany(
      {
        status: { $in: ['approved', 'published', 'available'] },
        expiresAt: { $ne: null, $lt: now }
      },
      { $set: { status: 'expired', updatedAt: now } }
    );

    const archiveCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const archivedResult = await Property.updateMany(
      {
        status: 'expired',
        expiresAt: { $ne: null, $lt: archiveCutoff }
      },
      { $set: { status: 'archived', updatedAt: now } }
    );

    console.log(`🕒 Listing expiry cron: ${expiredResult.modifiedCount ?? expiredResult.nModified} expired, ${archivedResult.modifiedCount ?? archivedResult.nModified} archived`);

    res.json({
      success: true,
      expiredListings: expiredResult.modifiedCount ?? expiredResult.nModified ?? 0,
      archivedListings: archivedResult.modifiedCount ?? archivedResult.nModified ?? 0,
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
    const limitNum = Math.min(parseInt(limit), 100); // cap page size at 100
    const skip = (pageNum - 1) * limitNum;

    let properties = await Property.find(query)
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Property.countDocuments(query);

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
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (req.user.role !== 'admin') {
      query = { ownerId: req.user._id };
    }

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

// ─── GET /api/properties/id/:id (fetch by MongoDB _id, for edit) ──
router.get('/id/:id', authMiddleware, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Only owner or admin can fetch for edit
    if (
      property.ownerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, property });
  } catch (error) {
    console.error('Error fetching property by id:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/properties/:slug (public) ────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const property = await Property.findOne({
      slug: req.params.slug,
      ...buildExpiryFilter()
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
router.post('/', authMiddleware, upload.array('images', LIMITS.IMAGES_MAX), async (req, res) => {
  try {
    console.log('📥 Incoming property data:', Object.keys(req.body));
    console.log('👤 User plan:', req.user.subscriptionPlan, '| expiry:', req.user.subscriptionExpiry);

    const {
      title, listingType, estate, county, price,
      bedrooms, bathrooms, parking, sqft, description, amenities,
      propertyType, size, status, available_for, rental_type
    } = req.body;

    // ── 1. Required fields ──────────────────────────────────────
    if (!title || !listingType || !estate || !price || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, listingType, estate, price, description'
      });
    }

    // ── 2. Length & format validation ──────────────────────────
    const cleanTitle = String(title).trim();
    const cleanDescription = String(description).trim();
    const cleanEstate = String(estate).trim();
    const cleanCounty = county ? String(county).trim() : 'Nairobi';

    if (cleanTitle.length < 5) {
      return res.status(400).json({ success: false, error: 'Title too short (min 5 chars)' });
    }
    if (cleanTitle.length > LIMITS.TITLE_MAX) {
      return res.status(400).json({ success: false, error: `Title too long (max ${LIMITS.TITLE_MAX} chars)` });
    }
    if (cleanDescription.length < LIMITS.DESCRIPTION_MIN) {
      return res.status(400).json({ success: false, error: `Description too short (min ${LIMITS.DESCRIPTION_MIN} chars)` });
    }
    if (cleanDescription.length > LIMITS.DESCRIPTION_MAX) {
      return res.status(400).json({ success: false, error: `Description too long (max ${LIMITS.DESCRIPTION_MAX} chars)` });
    }
    if (cleanEstate.length > LIMITS.ESTATE_MAX) {
      return res.status(400).json({ success: false, error: `Estate name too long (max ${LIMITS.ESTATE_MAX} chars)` });
    }
    if (cleanCounty.length > LIMITS.COUNTY_MAX) {
      return res.status(400).json({ success: false, error: `County name too long (max ${LIMITS.COUNTY_MAX} chars)` });
    }
    if (size && String(size).length > LIMITS.SIZE_MAX) {
      return res.status(400).json({ success: false, error: `Size field too long (max ${LIMITS.SIZE_MAX} chars)` });
    }

    // ── 3. Price validation ─────────────────────────────────────
    const numericPrice = parseFloat(price);
    if (!Number.isFinite(numericPrice) || numericPrice < LIMITS.PRICE_MIN) {
      return res.status(400).json({ success: false, error: 'Invalid price' });
    }
    if (numericPrice > LIMITS.PRICE_MAX) {
      return res.status(400).json({ success: false, error: 'Price too large' });
    }

    // ── 4. Amenities validation ─────────────────────────────────
    const amenitiesResult = sanitizeAmenities(amenities);
    if (!amenitiesResult.ok) {
      return res.status(400).json({ success: false, error: amenitiesResult.error });
    }
    const amenitiesArray = amenitiesResult.list;

    // ── 5. Subscription + listing limit check ───────────────────
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
        status: { $nin: ['archived', 'expired'] }
      });

      if (currentListings >= maxListings) {
        return res.status(403).json({
          success: false,
          error: `You have reached your plan's listing limit (${maxListings === Infinity ? 'unlimited' : maxListings}). Please upgrade to add more properties.`
        });
      }
    }

    // ── 6. Slug + images ────────────────────────────────────────
    const slug = await generateUniqueSlug(cleanTitle);
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    // ── 7. Compute expiresAt ────────────────────────────────────
    const plan = req.user.subscriptionPlan || 'free';
    let expiresAt = null;

    if (plan === 'free') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (req.user.subscriptionExpiry) {
      expiresAt = new Date(req.user.subscriptionExpiry);
    }

    // ── 8. Build property object ────────────────────────────────
    const propertyData = {
      ownerId: req.user._id,
      title: cleanTitle,
      slug,
      listingType,
      estate: cleanEstate,
      county: cleanCounty,
      price: numericPrice,
      bedrooms: parsePositiveInt(bedrooms),
      bathrooms: parsePositiveInt(bathrooms),
      parking: parsePositiveInt(parking),
      sqft: parsePositiveFloat(sqft),
      size: size ? String(size).trim() : '',
      description: cleanDescription,
      images: imageUrls,
      amenities: amenitiesArray,
      propertyType: propertyType || 'apartment',
      status: status || 'pending',
      available_for: available_for || '',
      rental_type: rental_type || '',
      ownerSubscriptionPlan: plan,
      expiresAt
    };

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
router.put('/:id', authMiddleware, upload.array('images', LIMITS.IMAGES_MAX), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this property' });
    }

    // ── Whitelist of updatable fields ──────────────────────────
   const UPDATABLE_FIELDS = [
  'title', 'listingType', 'estate', 'county', 'price',
  'bedrooms', 'bathrooms', 'parking', 'sqft', 'size',
  'description', 'propertyType', 'available_for', 'rental_type',
  'isAirbnb'
];

    const updateData = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // ── Validate & trim string fields ──────────────────────────
    if (updateData.title !== undefined) {
      updateData.title = String(updateData.title).trim();
      if (updateData.title.length > LIMITS.TITLE_MAX) {
        return res.status(400).json({ success: false, error: `Title too long (max ${LIMITS.TITLE_MAX} chars)` });
      }
    }
    if (updateData.description !== undefined) {
      updateData.description = String(updateData.description).trim();
      if (updateData.description.length > LIMITS.DESCRIPTION_MAX) {
        return res.status(400).json({ success: false, error: `Description too long (max ${LIMITS.DESCRIPTION_MAX} chars)` });
      }
      if (updateData.description.length < LIMITS.DESCRIPTION_MIN) {
        return res.status(400).json({ success: false, error: `Description too short (min ${LIMITS.DESCRIPTION_MIN} chars)` });
      }
    }
    if (updateData.estate !== undefined) {
      updateData.estate = String(updateData.estate).trim();
    }
    if (updateData.county !== undefined) {
      updateData.county = String(updateData.county).trim();
    }
    if (updateData.size !== undefined) {
      updateData.size = String(updateData.size).trim().slice(0, LIMITS.SIZE_MAX);
    }

    // ── Price validation ────────────────────────────────────────
    if (updateData.price !== undefined) {
      const p = parseFloat(updateData.price);
      if (!Number.isFinite(p) || p < LIMITS.PRICE_MIN || p > LIMITS.PRICE_MAX) {
        return res.status(400).json({ success: false, error: 'Invalid price' });
      }
      updateData.price = p;
    }

    // ── Numeric conversions ─────────────────────────────────────
    // ── Numeric conversions ─────────────────────────────────────
    if (updateData.bedrooms !== undefined) updateData.bedrooms = parsePositiveInt(updateData.bedrooms);
    if (updateData.bathrooms !== undefined) updateData.bathrooms = parsePositiveInt(updateData.bathrooms);
    if (updateData.parking !== undefined) updateData.parking = parsePositiveInt(updateData.parking);
    if (updateData.sqft !== undefined) updateData.sqft = parsePositiveFloat(updateData.sqft);

    // ── isAirbnb: FormData sends strings, coerce to boolean ─────
    if (updateData.isAirbnb !== undefined) {
      updateData.isAirbnb =
        updateData.isAirbnb === true || updateData.isAirbnb === 'true';
    }

    // ── Amenities validation ────────────────────────────────────
    if (req.body.amenities !== undefined) {
      const amenitiesResult = sanitizeAmenities(req.body.amenities);
      if (!amenitiesResult.ok) {
        return res.status(400).json({ success: false, error: amenitiesResult.error });
      }
      updateData.amenities = amenitiesResult.list;
    }

    // ── Handle images ───────────────────────────────────────────
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
    // Enforce max image count
    finalImages = finalImages.slice(0, LIMITS.IMAGES_MAX);
    updateData.images = finalImages;

    // ── Regenerate slug if title changed ────────────────────────
    if (updateData.title && updateData.title !== property.title) {
      updateData.slug = await generateUniqueSlug(updateData.title, property._id);
    }

    // ── Extend expiry when editing ──────────────────────────────
    if (req.body.extendExpiry === 'true' || property.status === 'expired') {
      const plan = property.ownerSubscriptionPlan || 'free';
      if (plan === 'free') {
        updateData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      if (property.status === 'expired') {
        updateData.status = 'pending';
      }
    }

    // ── Status: only allow safe values ──────────────────────────
    if (req.body.status !== undefined) {
      const allowedStatuses = ['available', 'sold', 'reserved', 'pending', 'rented', 'draft'];
      if (allowedStatuses.includes(req.body.status)) {
        updateData.status = req.body.status;
      }
    }

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