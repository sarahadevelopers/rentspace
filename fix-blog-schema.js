const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'blog');

// The faulty block we want to replace (with flexible whitespace)
const faultyPattern = /"publisher":\s*{\s*"@type":\s*"Organization",\s*"name":\s*"RentSpace",\s*"logo":\s*{\s*"@type":\s*"ImageObject",\s*}\s*},/g;

// The corrected version
const fixedBlock = `"publisher": {
  "@type": "Organization",
  "name": "RentSpace",
  "logo": {
    "@type": "ImageObject",
    "url": "https://rentspace.co.ke/images/RentSpace-favicon.webp"
  }
},`;

// Alternative pattern if the formatting is slightly different (e.g., no trailing comma after ImageObject)
const faultyPattern2 = /"publisher":\s*{\s*"@type":\s*"Organization",\s*"name":\s*"RentSpace",\s*"logo":\s*{\s*"@type":\s*"ImageObject"\s*}\s*},/g;

if (!fs.existsSync(blogDir)) {
  console.error('❌ Blog directory not found!');
  process.exit(1);
}

const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

console.log(`📁 Found ${files.length} blog files.`);

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Try first pattern (with comma)
  let newContent = content.replace(faultyPattern, fixedBlock);

  // If no change, try second pattern (without comma)
  if (newContent === content) {
    newContent = content.replace(faultyPattern2, fixedBlock);
  }

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    fixedCount++;
  } else {
    console.log(`⏭️  Skipped: ${file} (no matching pattern found)`);
  }
});

console.log(`\n🎉 Done! Fixed ${fixedCount} blog file(s).`);