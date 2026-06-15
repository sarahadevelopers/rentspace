const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'blog');
const outputFile = path.join(__dirname, 'data', 'posts.json');

// Ensure data folder exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
const posts = [];

for (const file of files) {
  const filePath = path.join(blogDir, file);
  const html = fs.readFileSync(filePath, 'utf8');
  const slug = file.replace('.html', '');

  // Extract title from <title> tag (remove trailing site name)
  let title = slug.replace(/-/g, ' ');
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    title = titleMatch[1].replace(/\s*\|\s*RentSpace\s*Blog.*$/, '');
  }

  // Extract description from <meta name="description">
  let description = '';
  const descMatch = html.match(/<meta name="description" content="(.*?)">/);
  if (descMatch) description = descMatch[1];

  // Determine category (based on filename or content)
  let category = 'guides';
  if (file.toLowerCase().includes('kitengela') || html.toLowerCase().includes('kitengela')) category = 'kitengela';
  if (file.toLowerCase().includes('syokimau') || html.toLowerCase().includes('syokimau')) category = 'syokimau';

  // Extract date from <meta property="article:published_time">
  let date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateMatch = html.match(/<meta property="article:published_time" content="(.*?)">/);
  if (dateMatch) date = new Date(dateMatch[1]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Extract image from <meta property="og:image">
  let image = '';
  const imgMatch = html.match(/<meta property="og:image" content="(.*?)">/);
  if (imgMatch) image = imgMatch[1];

  // Extract read time from .post-meta or default to 5 min
  let readTime = '5 min read';
  const readMatch = html.match(/<span><i class="far fa-clock"><\/i>\s*(\d+)\s*min read<\/span>/);
  if (readMatch) readTime = `${readMatch[1]} min read`;

  // Use description as excerpt if available, else first paragraph
  let excerpt = description;
  if (!excerpt) {
    const pMatch = html.match(/<p>(.*?)<\/p>/);
    if (pMatch) excerpt = pMatch[1].replace(/<[^>]*>/g, '');
  }
  excerpt = excerpt.substring(0, 200);

  posts.push({
    slug: slug,
    title: title,
    excerpt: excerpt,
    category: category,
    image: image,
    date: date,
    readTime: readTime,
    views: Math.floor(Math.random() * 5000) + 1000 // placeholder, since you don't have real view counts
  });
}

// Sort by date (newest first)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(outputFile, JSON.stringify(posts, null, 2));
console.log(`✅ Generated ${outputFile} with ${posts.length} posts.`);