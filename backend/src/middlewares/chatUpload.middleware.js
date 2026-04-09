const multer = require("multer");
const path = require("path");

const env = require("../config/env");
const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/apiError");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function ensureCloudinaryConfigured() {
  if (
    !env.cloudinary.cloudName ||
    !env.cloudinary.apiKey ||
    !env.cloudinary.apiSecret
  ) {
    throw new ApiError(
      503,
      "Cloudinary is not configured. Add Cloudinary credentials to the environment."
    );
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.cloudinary.maxUploadBytes,
  },
  fileFilter(request, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new ApiError(
          400,
          "Only jpg, jpeg, png, webp, and avif chat images are allowed"
        )
      );
    }

    return callback(null, true);
  },
});

function getCloudinaryFormat(file) {
  const extension = path.extname(file.originalname || "")
    .replace(".", "")
    .toLowerCase();

  if (["jpg", "jpeg", "png", "webp", "avif"].includes(extension)) {
    return extension === "jpg" ? "jpeg" : extension;
  }

  if (file.mimetype === "image/jpeg") {
    return "jpeg";
  }

  if (file.mimetype === "image/png") {
    return "png";
  }

  if (file.mimetype === "image/webp") {
    return "webp";
  }

  if (file.mimetype === "image/avif") {
    return "avif";
  }

  throw new ApiError(400, "Unsupported image format");
}

function uploadBufferToCloudinary(request, file) {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.chatImageFolder,
        resource_type: "image",
        public_id: `chat_${request.user.userId}_${Date.now()}`,
        format: getCloudinaryFormat(file),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

function handleChatUpload(request, response, next) {
  upload.single("image")(request, response, async (error) => {
    if (error) {
      return next(error);
    }

    if (request.file?.buffer) {
      try {
        const uploadedAsset = await uploadBufferToCloudinary(request, request.file);

        request.file.path = uploadedAsset.secure_url;
        request.file.cloudinary = {
          publicId: uploadedAsset.public_id,
          assetId: uploadedAsset.asset_id,
        };
      } catch (uploadError) {
        return next(uploadError);
      }
    }

    if (request.file?.path) {
      // Multipart chat requests are normalized back into the existing JSON chat shape.
      request.body.type = "image";
      request.body.imageUrl = request.file.path;
    }

    return next();
  });
}

module.exports = handleChatUpload;
