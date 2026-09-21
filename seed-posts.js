// ============================================
// seed-posts.js — Push blog posts into MongoDB
// ============================================
// Usage:  node seed-posts.js
// Reads:  data/posts.json
// Writes: MongoDB → `posts` collection via models/Post.js
// ============================================

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let Post;
try {
  Post = require('./models/Post');
} catch (e) {
  console.error('❌ Could not load ./models/Post.js:', e.message);
  process.exit(1);
}

const SOURCE = path.join(__dirname, 'data', 'posts.json');

// ─── Helpers ─────────────────────────────────────

function parseDate(input) {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const native = new Date(input);
  if (!isNaN(native.getTime())) return native;
  const fixed = String(input).replace(/^[a-z]/, c => c.toUpperCase());
  const second = new Date(fixed);
  return isNaN(second.getTime()) ? new Date() : second;
}

function truncate(str, max = 155) {
  if (!str) return '';
  const s = String(str).trim();
  return s.length <= max ? s : s.slice(0, max - 1).trim() + '…';
}

function coercePost(raw) {
  const excerpt = raw.excerpt || '';
  return {
    title: raw.title || 'Untitled',
    slug: (raw.slug || '').toLowerCase(),
    excerpt,
    content: raw.content || '',
    category: (raw.category || 'general').toLowerCase(),
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    image: raw.image || '',
    date: parseDate(raw.date),
    readTime: raw.readTime || '3 min read',
    author: null,
    status: 'published',
    metaDescription: raw.metaDescription || truncate(excerpt),
    metaKeywords: raw.metaKeywords || (raw.title + ' ' + (raw.category || '')).toLowerCase(),
    views: Number(raw.views) || 0
  };
}

// ─── Main ────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set — check .env');
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE)) {
    console.error(`❌ Source not found: ${SOURCE}`);
    process.exit(1);
  }

  let posts;
  try {
    posts = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  } catch (e) {
    console.error('❌ posts.json invalid:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(posts)) {
    console.error('❌ posts.json must be an array.');
    process.exit(1);
  }

  console.log('');
  console.log('==================================================');
  console.log('🚀 SEEDING POSTS INTO MONGODB');
  console.log('==================================================');
  console.log(`📖 Loaded ${posts.length} posts`);

  await mongoose.connect(uri);
  console.log('🔌 Connected');

  let created = 0, updated = 0, skipped = 0;
  const errors = [];

  for (const raw of posts) {
    try {
      const post = coercePost(raw);

      if (!post.title || !post.slug) {
        console.warn(`   ⚠️  Skipped: ${raw.title || '(untitled)'}`);
        skipped++;
        continue;
      }

      const existing = await Post.findOne({ slug: post.slug });

      if (existing) {
        // Preserve existing content if the new one is empty
        if (!post.content && existing.content) post.content = existing.content;
        Object.assign(existing, post);
        await existing.save();
        updated++;
        console.log(`   🔄 ${post.slug}`);
      } else {
        await Post.create(post);
        created++;
        console.log(`   ✅ ${post.slug}`);
      }
    } catch (err) {
      const id = raw.slug || raw.title || '?';
      errors.push({ id, message: err.message });
      console.error(`   ❌ ${id} — ${err.message}`);
    }
  }

  console.log('');
  console.log('==================================================');
  console.log('🎉 SEED COMPLETE');
  console.log('==================================================');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed:  ${errors.length}`);
  if (errors.length) {
    console.log('');
    errors.forEach(e => console.log(`   - ${e.id}: ${e.message}`));
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected');

  const missingContent = posts.filter(p => !p.content).length;
  if (missingContent > 0) {
    console.log('');
    console.log(`💡 ${missingContent} post(s) have empty content — pages will render blank.`);
  }

  console.log('');
  console.log('👉 Verify:');
  console.log('   curl "https://rentspace-markeplace.onrender.com/api/posts?limit=5"');
  console.log('   Should return count: 41');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});