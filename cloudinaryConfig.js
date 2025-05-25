const cloudinary = require('cloudinary').v2;

if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing required Cloudinary configuration. Image upload functionality will not work.');
  process.exit(1);
}

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Force HTTPS
  });

  // Verify configuration by making a test API call
  cloudinary.api.ping()
    .then(() => console.log('Cloudinary configuration verified successfully'))
    .catch(error => {
      console.error('Failed to verify Cloudinary configuration:', error);
      process.exit(1);
    });

} catch (error) {
  console.error('Failed to initialize Cloudinary:', error);
  process.exit(1);
}

module.exports = cloudinary;