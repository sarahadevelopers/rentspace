// test-seo-put.js
// Sends a PUT request with SEO fields directly to the backend.
// If this works, the backend is fine and the bug is in the browser.
// If this fails, the backend route is stripping the fields.

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Property = require('./models/Property');

const API_BASE = process.env.BASE_URL || 'https://rentspace-markeplace.onrender.com';
const SLUG = process.argv[2] || 'one-bedroom-apartment-in-syokimau';

(async () => {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!MONGO_URI || !JWT_SECRET) {
    console.error('❌ MONGODB_URI or JWT_SECRET missing in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('🔌 Connected to MongoDB\n');

  // Find the property and its owner
  const property = await Property.findOne({ slug: SLUG });
  if (!property) {
    console.error(`❌ No property found with slug: ${SLUG}`);
    process.exit(1);
  }

  // Find the owner (or any admin) to sign a token for
  const owner = await User.findById(property.ownerId);
  if (!owner) {
    console.error('❌ Property owner not found');
    process.exit(1);
  }

  console.log(`📄 Property: ${property.title}`);
  console.log(`👤 Owner:    ${owner.email} (role: ${owner.role})`);
  console.log('');

  // Sign a JWT the same way the backend does
  // Sign with all common claim names so the middleware finds one it likes
const token = jwt.sign(
  {
    id: owner._id.toString(),
    _id: owner._id.toString(),
    userId: owner._id.toString(),
    role: owner.role
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

  // Build a multipart/form-data body
  const testSeoTitle = `API-TEST-${Date.now()}`;
  const form = new FormData();
  form.append('seo_title',        testSeoTitle);
  form.append('meta_description', 'API test meta description');
  form.append('why_rent',         'API test why rent text');

  console.log('📤 Sending PUT request to backend...');
  console.log(`   URL: ${API_BASE}/api/properties/${property._id}`);
  console.log(`   seo_title: ${testSeoTitle}`);
  console.log('');

  const res = await fetch(`${API_BASE}/api/properties/${property._id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });

  const status = res.status;
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  console.log(`📥 Response status: ${status}`);
  console.log('   Body:', JSON.stringify(data, null, 2).slice(0, 500));
  console.log('');

  // Now read back from DB to see what was actually stored
  await new Promise(r => setTimeout(r, 1000));
  const fresh = await Property.findById(property._id).lean();

  console.log('🔍 What MongoDB now has:');
  console.log(`   seo_title:        "${fresh.seo_title || ''}"`);
  console.log(`   meta_description: "${fresh.meta_description || ''}"`);
  console.log(`   why_rent:         "${fresh.why_rent || ''}"`);
  console.log('');

  if (fresh.seo_title === testSeoTitle) {
    console.log('✅ BACKEND IS FINE — the API accepted and stored the SEO fields.');
    console.log('   → Your browser is running an old cached dashboard.js.');
    console.log('   → Fix: unregister the service worker and hard-refresh in Incognito.');
  } else {
    console.log('❌ BACKEND IS STRIPPING THE FIELDS');
    console.log(`   → Sent: "${testSeoTitle}", stored: "${fresh.seo_title || ''}"`);
    console.log('   → The deployed route on Render is not saving them.');
    console.log('   → Check that routes/properties.js on Render matches your local file.');
  }

  await mongoose.disconnect();
  console.log('\n✅ Done.');
})().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});