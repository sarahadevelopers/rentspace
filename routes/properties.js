const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Property = require('../models/Property');
const User = require('../models/User'); // added for user lookup
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── Cloudinary Configuration ──────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─── Multer Storage (uploads directly to Cloudinary) ──────────
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

// ─── Helper: generate unique slug from title ──────────────────
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

// ─── Helper: check if a user's subscription is active ─────────
function isSubscriptionActive(user) {
  if (!user) return false;
  const plan = user.subscriptionPlan || 'free';
  const expiry = user.subscriptionExpiry;

  // If plan is free, check trial period (30 days from signup)
  if (plan === 'free') {
    const trialStart = user.createdAt || user.trialStartDate;
    if (!trialStart) return false;
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 30);
    return new Date() < trialEnd;
  }

  // For paid plans, check expiry
  if (['basic', 'pro', 'developer'].includes(plan)) {
    if (!expiry) return false;
    return new Date(expiry) > new Date();
  }

  return false;
}

// ─── Helper: get listing limit for a user ──────────────────────
function getListingLimit(user) {
  const plan = user.subscriptionPlan || 'free';
  const limits = {
    free: 2,
    basic: 20,
    pro: Infinity,
    developer: Infinity
  };
  return limits[plan] || 2;
}

// ─── GET /api/properties (public, with ranking) ────────────────
// Properties are ranked by:
//   1. featured (manual override)
//   2. owner subscription plan (developer > pro > basic > free)
//   3. creation date (newest first)
// Additionally, contact details are hidden for free/trial-expired listings.
router.get('/', async (req, res) => {
  try {
    const {
      estate,
      minPrice,
      maxPrice,
      type,
      bedrooms,
      bathrooms,
      featured,
      page = 1,
      limit = 20
    } = req.query;

    const query = { status: 'approved' };

    if (estate) query.estate = estate;
    if (type) query.listingType = type;
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

    // ── Aggregation pipeline for ranking ────────────────────────
    const pipeline = [
      { $match: query },
      {
        $addFields: {
          priority: {
            $switch: {
              branches: [
                { case: { $eq: ['$ownerSubscriptionPlan', 'developer'] }, then: 4 },
                { case: { $eq: ['$ownerSubscriptionPlan', 'pro'] }, then: 3 },
                { case: { $eq: ['$ownerSubscriptionPlan', 'basic'] }, then: 2 },
                { case: { $eq: ['$ownerSubscriptionPlan', 'free'] }, then: 1 }
              ],
              default: 0
            }
          }
        }
      },
      { $sort: { featured: -1, priority: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum }
    ];

    let properties = await Property.aggregate(pipeline);
    const total = await Property.countDocuments(query);

    // ── Enrich with owner details and hide contact info for free ──
    const propertyIds = properties.map(p => p._id);
    const owners = await User.find({ _id: { $in: properties.map(p => p.ownerId) } })
      .select('_id phone email name subscriptionPlan subscriptionExpiry createdAt');

    const ownerMap = {};
    owners.forEach(u => { ownerMap[u._id.toString()] = u; });

    properties = properties.map(p => {
      const owner = ownerMap[p.ownerId.toString()];
      if (!owner) return p;

      const isActive = isSubscriptionActive(owner);
      const isFree = (owner.subscriptionPlan || 'free') === 'free';
      // If free or trial expired, hide contact details
      const hideContact = !isActive || (isFree && !isSubscriptionActive(owner));

      // Create a clean copy
      const property = { ...p };
      if (hideContact) {
        // Remove sensitive fields
        delete property.phone;
        delete property.email;
        delete property.whatsapp;
        // Optionally replace with a concierge message
        property.contactHidden = true;
        property.contactMessage = 'Contact details hidden. Please upgrade or login to view.';
      } else {
        // Include contact details from owner (if not already in property)
        property.phone = owner.phone || property.phone;
        property.email = owner.email || property.email;
        property.ownerName = owner.name || property.ownerName;
      }

      return property;
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
    res.status(500).json({ success: false, error: 'Server error fetching properties' });
  }
});

// ─── GET /api/properties/my-properties (authenticated) ────────
// MUST be placed BEFORE /:slug to avoid conflict
router.get('/my-properties', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    // If user is admin, show all properties; otherwise only their own
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

// ─── GET /api/properties/:slug (public) ────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const property = await Property.findOne({ slug: req.params.slug }).lean();
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Increment view count asynchronously
    Property.updateOne({ _id: property._id }, { $inc: { views: 1 } }).exec();

    // ── Enrich with owner details and hide contact info if needed ──
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

// ─── POST /api/properties (authenticated, with image upload) ──
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    console.log('📥 Incoming property data (body):', req.body);
    console.log('📸 Uploaded files:', req.files);
    console.log('👤 User subscription plan:', req.user.subscriptionPlan);
    console.log('👤 User subscription expiry:', req.user.subscriptionExpiry);

    // ── 1. Validate required fields ──────────────────────────────
    const {
      title,
      listingType,
      estate,
      county,
      price,
      bedrooms,
      bathrooms,
      parking,
      sqft,
      description,
      amenities,
      propertyType,
      size,
      status,
      available_for,
      rental_type
    } = req.body;

    if (!title || !listingType || !estate || !price || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, listingType, estate, price, description'
      });
    }

    // ── 2. Subscription, Trial, and Listing Limit Check ──────────
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      // Check if user is active (subscription or trial)
      const isActive = isSubscriptionActive(req.user);

      if (!isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your subscription has expired or trial ended. Please upgrade to list properties.'
        });
      }

      // Check listing limit
      const maxListings = getListingLimit(req.user);
      const currentListings = await Property.countDocuments({
        ownerId: req.user._id,
        status: { $ne: 'archived' }
      });

      if (currentListings >= maxListings) {
        return res.status(403).json({
          success: false,
          error: `You have reached your plan's listing limit (${maxListings === Infinity ? 'unlimited' : maxListings}). Please upgrade to add more properties.`
        });
      }
    }

    // ── 3. Generate slug ──────────────────────────────────────────
    const slug = await generateUniqueSlug(title);

    // ── 4. Extract image URLs from Cloudinary upload ─────────────
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    // ── 5. Parse amenities (if sent as JSON string) ──────────────
    let amenitiesArray = [];
    if (amenities) {
      try {
        amenitiesArray = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
      } catch (e) {
        amenitiesArray = [];
      }
    }

    // ── 6. Build property object (including owner's plan) ────────
    const propertyData = {
      ownerId: req.user._id,
      title,
      slug,
      listingType,
      estate,
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
      ownerSubscriptionPlan: req.user.subscriptionPlan || 'free'
    };

    console.log('📦 Property data to save:', propertyData);

    // ── 7. Save to database ───────────────────────────────────────
    const property = await Property.create(propertyData);

    res.status(201).json({ success: true, property });
  } catch (error) {
    console.error('❌ Property creation error FULL:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message,
        fields: Object.keys(error.errors)
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate property (slug already exists)'
      });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      success: false,
      error: isProduction
        ? 'Server error creating property. Please try again later.'
        : error.message,
      ...(isProduction ? {} : { stack: error.stack })
    });
  }
});

// ─── PUT /api/properties/:id (authenticated, owner or admin) ──
router.put('/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Check ownership or admin
    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this property' });
    }

    // ── Build update data from request body ──────────────────
    const updateData = { ...req.body };

    // ── Handle images ──────────────────────────────────────────
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = typeof req.body.existingImages === 'string'
          ? JSON.parse(req.body.existingImages)
          : req.body.existingImages;
      } catch (e) {
        existingImages = [];
      }
    }

    const newImageUrls = req.files ? req.files.map(file => file.path) : [];
    let finalImages = existingImages.length > 0 ? existingImages : property.images || [];
    if (newImageUrls.length > 0) {
      finalImages = [...finalImages, ...newImageUrls];
    }
    updateData.images = finalImages;

    // ── Handle slug if title changes ──────────────────────────
    if (req.body.title && req.body.title !== property.title) {
      updateData.slug = await generateUniqueSlug(req.body.title, property._id);
    }

    // ── Remove fields that shouldn't be updated ──────────────
    delete updateData._id;
    delete updateData.ownerId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.slug; // handled above
    delete updateData.existingImages;
    delete updateData.existingPublicIds;

    // ── Update the property ────────────────────────────────────
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

// ─── DELETE /api/properties/:id (authenticated, owner or admin) ──
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