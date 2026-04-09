const { v2: cloudinary } = require("cloudinary");

const env = require("./env");

if (
  env.cloudinary.cloudName &&
  env.cloudinary.apiKey &&
  env.cloudinary.apiSecret
) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName.trim(),
    api_key: env.cloudinary.apiKey.trim(),
    api_secret: env.cloudinary.apiSecret.trim(),
    secure: true,
  });
}

module.exports = cloudinary;
