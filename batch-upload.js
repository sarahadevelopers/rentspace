const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'ddmbp2jb5',
  api_key: '421919695614452',
  api_secret: 'gOareq9r34PUysNrCCHGUEC3YYw'
});

// Folder containing your new images
const imagesFolder = path.join(__dirname, 'new-property-images');

// Get all image files (supports .jpg, .jpeg, .png, .webp, .gif)
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const files = fs.readdirSync(imagesFolder).filter(file =>
  imageExtensions.includes(path.extname(file).toLowerCase())
);

if (files.length === 0) {
  console.log('No images found in the folder. Please add some images.');
  process.exit(0);
}

console.log(`Found ${files.length} image(s). Uploading...`);

// Upload each file
const uploadPromises = files.map((file, index) => {
  const filePath = path.join(imagesFolder, file);
  // Use a custom public_id: "property_" + timestamp + index to avoid conflicts
  const publicId = `property_${Date.now()}_${index}`;

  return cloudinary.uploader.upload(filePath, { public_id: publicId })
    .then(result => ({
      file: file,
      secure_url: result.secure_url,
      public_id: result.public_id
    }))
    .catch(err => {
      console.error(`Failed to upload ${file}:`, err.message);
      return null;
    });
});

Promise.all(uploadPromises).then(results => {
  const successful = results.filter(r => r !== null);

  if (successful.length === 0) {
    console.log('No images were uploaded successfully.');
    return;
  }

  console.log('\n✅ Upload complete!');
  console.log(`Uploaded ${successful.length} image(s).`);

  // Generate JSON snippet
  console.log('\n📋 Copy this snippet into your properties.json:');
  console.log('"images": [');
  successful.forEach((item, i) => {
    const comma = (i === successful.length - 1) ? '' : ',';
    console.log(`  "${item.secure_url}"${comma}`);
  });
  console.log(']');
});