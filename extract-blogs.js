// ============================================
// extract-blogs.js — Rebuild data/posts.json
// from the HTML files in blog/
// ============================================
// Usage:  node extract-blogs.js
// Reads:  blog/*.html  (all files, ignores index)
// Writes: data/posts.json  (sorted newest first)
// ============================================

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, 'blog');
const OUT_FILE = path.join(__dirname, 'data', 'posts.json');
const TEMPLATE_MARKER = 'blog-post-template.html'; // ignore if it exists

// ─── Small regex helper ──────────────────────────
function grab(html, ...patterns) {
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

// ─── Parse one HTML file ─────────────────────────
function parsePost(file, html) {
  const slug = file.replace(/\.html$/i, '');

  // Title — prefer <h1 class="post-title">, fall back to <title>
  const title = grab(
    html,
    /<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    /<title>([^<|]+)/i
  ).replace(/\s+/g, ' ').trim();

  // Category
  const category = grab(
    html,
    /<span[^>]*class="[^"]*post-category[^"]*"[^>]*>([\s\S]*?)<\/span>/i
  ).toLowerCase() || 'general';

  // Excerpt / meta description
  const metaDescription = grab(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"/i,
    /<meta\s+property="og:description"\s+content="([^"]+)"/i
  );

  // Date — inside the post-meta block, right after the calendar icon
  const date = grab(
    html,
    /fa-calendar-alt["'][^>]*><\/i>\s*([^<]+)</i,
    /fa-calendar[^>]*><\/i>\s*([^<]+)</i
  ).replace(/\s+/g, ' ').trim();

  // Read time — after the clock icon
  const readTime = grab(
    html,
    /fa-clock["'][^>]*><\/i>\s*([^<]+)</i
  ).replace(/\s+/g, ' ').trim() || '5 min read';

  // Views — after the eye icon, may have commas
  const viewsRaw = grab(
    html,
    /fa-eye["'][^>]*><\/i>\s*([\d,]+)\s*views/i,
    /fa-eye["'][^>]*><\/i>\s*([\d,]+)/i
  );
  const views = parseInt(viewsRaw.replace(/,/g, ''), 10) || 0;

  // Featured image — check both attribute orders
  const image = grab(
    html,
    /<img[^>]*class="[^"]*post-featured-image[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*src="([^"]+)"[^>]*class="[^"]*post-featured-image[^"]*"/i
  );

  // Content — everything inside <div class="post-content"> up to the recommendations block
  let content = '';
  const contentMatch = html.match(
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\s*!--\s*Property Recommendations|<\s*div[^>]*class="[^"]*property-recommendations)/i
  );
  if (contentMatch) {
    content = contentMatch[1].trim();
  } else {
    // Fallback: try up to <article> close or a second </div> after recommendations
    const fallback = html.match(
      /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\s*\/article>/i
    );
    if (fallback) content = fallback[1].trim();
  }

  return {
    slug,
    title,
    category,
    image,
    date,
    readTime,
    views,
    excerpt: metaDescription || title,
    metaDescription: metaDescription || '',
    content
  };
}

// ─── Main ────────────────────────────────────────
function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌ blog/ folder not found at ${BLOG_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => f.toLowerCase() !== 'index.html')
    .filter(f => !f.includes(TEMPLATE_MARKER));

  if (files.length === 0) {
    console.error('❌ No .html files found in blog/.');
    process.exit(1);
  }

  console.log(`📂 Found ${files.length} HTML files in blog/`);

  const posts = [];
  const failures = [];

  for (const file of files) {
    try {
      const html = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
      const post = parsePost(file, html);

      if (!post.title) {
        failures.push({ file, reason: 'no title extracted' });
        continue;
      }
      posts.push(post);
    } catch (err) {
      failures.push({ file, reason: err.message });
    }
  }

  // Sort newest first (parse date strings like "May 20, 2026")
  posts.sort((a, b) => {
    const da = new Date(a.date).getTime() || 0;
    const db = new Date(b.date).getTime() || 0;
    return db - da;
  });

  // Ensure data/ folder exists
  const dataDir = path.dirname(OUT_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2), 'utf8');

  console.log('');
  console.log('==================================================');
  console.log('🎉 EXTRACTION COMPLETE');
  console.log('==================================================');
  console.log(`   ✅ Posts extracted: ${posts.length}`);
  console.log(`   💾 Written to: ${OUT_FILE}`);

  if (failures.length) {
    console.log('');
    console.log(`   ⚠️  ${failures.length} file(s) skipped:`);
    failures.forEach(f => console.log(`      - ${f.file}: ${f.reason}`));
  }

  // ─── Quick sanity check ──────────────────────
  console.log('');
  console.log('📋 Preview (first 3 posts):');
  posts.slice(0, 3).forEach((p, i) => {
    const contentLen = p.content ? p.content.length : 0;
    console.log(`   ${i + 1}. [${p.slug}]`);
    console.log(`      title:    ${p.title.slice(0, 70)}${p.title.length > 70 ? '…' : ''}`);
    console.log(`      category: ${p.category}`);
    console.log(`      date:     ${p.date}`);
    console.log(`      views:    ${p.views}`);
    console.log(`      content:  ${contentLen.toLocaleString()} chars`);
  });

  console.log('');
  console.log('👉 Next steps:');
  console.log('   1. Open data/posts.json to verify a few entries look right');
  console.log('   2. git add data/posts.json');
  console.log('   3. git commit -m "Rebuild posts.json from blog HTML files"');
  console.log('   4. git push');
  console.log('   5. blog.html listing will now show all posts');
}

main();