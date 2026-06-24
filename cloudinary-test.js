const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'ddmbp2jb5',
  api_key: '421919695614452',
  api_secret: 'gOareq9r34PUysNrCCHGUEC3YYw'
});

// 1. Upload a sample image from Cloudinary's demo domain
const sampleUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

console.log('📤 Uploading sample image...');
cloudinary.uploader.upload(sampleUrl, { public_id: 'sample_upload' }, (error, result) => {
  if (error) {
    console.error('❌ Upload error:', error);
    return;
  }

  console.log('✅ Upload successful!');
  console.log('📌 Public ID:', result.public_id);
  console.log('🔗 Secure URL:', result.secure_url);

  // 2. Get image details
  console.log('📊 Image details:');
  console.log('   Width (px):', result.width);
  console.log('   Height (px):', result.height);
  console.log('   Format:', result.format);
  console.log('   File size (bytes):', result.bytes);

  // 3. Generate a transformed version with f_auto and q_auto
  //    f_auto = automatically choose best format (e.g., WebP, AVIF)
  //    q_auto = automatically set optimal quality for smallest file size
  const transformedUrl = cloudinary.url(result.public_id, {
    transformation: [
      { fetch_format: 'auto' },
      { quality: 'auto' }
    ]
  });

  console.log('\n🔄 Transformed URL (f_auto + q_auto):');
  console.log(transformedUrl);
  console.log('\n✅ Done! Click the link above to see the optimized version of the image.');
  console.log('   Check the file size and format – it should be smaller and in a modern format like WebP.');
});