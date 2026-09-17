// check-seo-fields.js
// Quick diagnostic: dumps the SEO fields of a property to the console.
// Usage: node check-seo-fields.js [slug]
//        node check-seo-fields.js one-bedroom-apartment-in-syokimau

require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./models/Property');

const slug = process.argv[2] || 'one-bedroom-apartment-in-syokimau';

(async () => {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(`🔌 Connected to MongoDB\n`);

  const doc = await Property.findOne({ slug }).lean();

  if (!doc) {
    console.log(`❌ No property found with slug: "${slug}"`);
    console.log('   Try a different slug, or list all:');
    const all = await Property.find({}, { slug: 1, title: 1 }).limit(10).lean();
    all.forEach(p => console.log(`     - ${p.slug}  (${p.title})`));
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📄 Property: ${doc.title}`);
  console.log(`   slug: ${doc.slug}`);
  console.log(`   _id:  ${doc._id}`);
  console.log(`   updatedAt: ${doc.updatedAt}`);
  console.log('');

  // Check whether the SEO fields even exist on the document
  const hasSeoTitle = Object.prototype.hasOwnProperty.call(doc, 'seo_title');
  const hasMetaDesc = Object.prototype.hasOwnProperty.call(doc, 'meta_description');
  const hasWhyRent  = Object.prototype.hasOwnProperty.call(doc, 'why_rent');

  console.log('🔍 SEO FIELD STATUS');
  console.log('─'.repeat(60));

  const report = (label, present, value) => {
    if (!present) {
      console.log(`   ❌ ${label}: FIELD MISSING (not in document)`);
      return 'missing';
    }
    if (!value || !String(value).trim()) {
      console.log(`   ⚠️  ${label}: EMPTY STRING ("")`);
      return 'empty';
    }
    const preview = String(value).length > 70
      ? String(value).slice(0, 70) + '…'
      : String(value);
    console.log(`   ✅ ${label}: "${preview}"`);
    return 'ok';
  };

  const s1 = report('seo_title       ', hasSeoTitle, doc.seo_title);
  const s2 = report('meta_description', hasMetaDesc, doc.meta_description);
  const s3 = report('why_rent        ', hasWhyRent, doc.why_rent);

  console.log('─'.repeat(60));
  console.log('');

  // Verdict
  const allMissing = [s1, s2, s3].every(s => s === 'missing');
  const allEmpty   = [s1, s2, s3].every(s => s === 'empty');
  const allOk      = [s1, s2, s3].every(s => s === 'ok');

  if (allOk) {
    console.log('✅ STATE 1 — Values are saved correctly.');
    console.log('   → Save works. The load path (populateForEdit) is broken.');
    console.log('   → Fix: check js/dashboard.js populateForEdit.');
  } else if (allMissing) {
    console.log('❌ STATE 3 — SEO fields are NOT in the document at all.');
    console.log('   → The model or the deployed backend is out of date.');
    console.log('   → Check that models/Property.js on Render matches your local file.');
  } else if (allEmpty) {
    console.log('⚠️  STATE 2 — Fields exist but are empty strings.');
    console.log('   → Save is stripping the values before writing to Mongo.');
    console.log('   → Check the PUT request payload in DevTools → Network tab.');
  } else {
    console.log('🤔 MIXED STATE — some fields present, others missing/empty.');
    console.log('   → Likely a partial save; check the PUT payload for what was sent.');
  }

  await mongoose.disconnect();
  console.log('\n✅ Done.');
})().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});