const fs = require('fs');
const path = require('path');

const propertyDir = path.join(__dirname, 'property');

// Read all HTML files in the property directory
const files = fs.readdirSync(propertyDir).filter(f => f.endsWith('.html'));

console.log(`📁 Found ${files.length} property files to fix...`);

files.forEach(file => {
  const filePath = path.join(propertyDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if the file contains the conflict
  if (content.includes('const lightboxPrev') && content.includes('function lightboxPrev()')) {
    
    // Replace variable declarations
    content = content.replace(/const lightboxPrev = document\.getElementById\('lightboxPrev'\);/g, 
                               'const lightboxPrevBtn = document.getElementById(\'lightboxPrev\');');
    content = content.replace(/const lightboxNext = document\.getElementById\('lightboxNext'\);/g, 
                               'const lightboxNextBtn = document.getElementById(\'lightboxNext\');');
    
    // Replace function names
    content = content.replace(/function lightboxPrev\(\)/g, 'function lightboxPrevImage()');
    content = content.replace(/function lightboxNext\(\)/g, 'function lightboxNextImage()');
    
    // Replace function calls in event listeners
    content = content.replace(/lightboxPrev\(\)/g, 'lightboxPrevImage()');
    content = content.replace(/lightboxNext\(\)/g, 'lightboxNextImage()');
    
    // Also fix the arrow key listeners
    content = content.replace(/if \(e\.key === 'ArrowLeft'\) lightboxPrev\(\)/g, 
                               "if (e.key === 'ArrowLeft') lightboxPrevImage()");
    content = content.replace(/if \(e\.key === 'ArrowRight'\) lightboxNext\(\)/g, 
                               "if (e.key === 'ArrowRight') lightboxNextImage()");
    
    // Write back the fixed content
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⏭️ No conflict (or already fixed): ${file}`);
  }
});

console.log('🎉 All property pages fixed!');