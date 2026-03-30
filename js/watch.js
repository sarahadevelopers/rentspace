const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DATA_FILE = path.join(__dirname, 'data', 'properties.json');
const TEMPLATE_FILE = path.join(__dirname, 'templates', 'property-template.html');
const OUTPUT_DIR = path.join(__dirname, 'property');

let lastData = '';
let lastSlugs = new Set();

// Read current slugs from JSON
function getCurrentSlugs() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const properties = JSON.parse(data);
    return new Set(properties.map(p => p.slug));
  } catch (e) {
    return new Set();
  }
}

// Regenerate specific property pages
function regenerateSpecific(slugs) {
  return new Promise((resolve, reject) => {
    const slugsList = Array.from(slugs).join(' ');
    if (slugsList.length === 0) {
      resolve();
      return;
    }
    
    console.log(`🔄 Regenerating: ${slugsList}`);
    
    // Run generator with specific slugs (you'd need to modify generate-pages.js to accept slugs)
    exec(`node generate-pages.js --slugs ${slugsList}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error}`);
        reject(error);
        return;
      }
      console.log(stdout);
      resolve();
    });
  });
}

// Watch for changes
console.log('👀 Watching for changes...');
console.log('   Press Ctrl+C to stop\n');

let timeout;
let previousSlugs = getCurrentSlugs();

fs.watch(DATA_FILE, (eventType) => {
  if (eventType === 'change') {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const currentSlugs = getCurrentSlugs();
      
      // Find added and removed slugs
      const added = [...currentSlugs].filter(slug => !previousSlugs.has(slug));
      const removed = [...previousSlugs].filter(slug => !currentSlugs.has(slug));
      
      if (added.length > 0) {
        console.log(`➕ Added properties: ${added.join(', ')}`);
        regenerateSpecific(added);
      }
      
      if (removed.length > 0) {
        console.log(`➖ Removed properties: ${removed.join(', ')}`);
        // Delete removed property files
        removed.forEach(slug => {
          const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  Deleted: ${slug}.html`);
          }
        });
      }
      
      if (added.length === 0 && removed.length === 0) {
        // Properties updated but not added/removed - regenerate all (or implement diff)
        console.log('📝 Properties updated, regenerating all...');
        exec('node generate-pages.js', (error, stdout, stderr) => {
          if (!error) console.log('✅ Regeneration complete!');
        });
      }
      
      previousSlugs = currentSlugs;
    }, 500);
  }
});

fs.watch(TEMPLATE_FILE, () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log('📝 Template changed, regenerating all properties...');
    exec('node generate-pages.js', (error, stdout, stderr) => {
      if (!error) console.log('✅ Regeneration complete!');
    });
  }, 500);
});

console.log(`📁 Watching: ${DATA_FILE}`);
console.log(`📁 Watching: ${TEMPLATE_FILE}\n`);