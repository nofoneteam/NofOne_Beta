const multer = require("multer");

const env = require("../config/env");
const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/apiError");

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
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
          "Only pdf, txt, jpg, jpeg, png, and webp report files are allowed"
        )
      );
    }

    return callback(null, true);
  },
});

function uploadBufferToCloudinary(request, file) {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.medicalReportFolder,
        resource_type: "auto",
        public_id: `report_${request.user.userId}_${Date.now()}`,
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

function handleReportUpload(request, response, next) {
  upload.single("report")(request, response, async (error) => {
    if (error) {
      return next(error);
    }

    if (!request.file?.buffer) {
      return next(new ApiError(400, "Report file is required"));
    }

    try {
      const uploadedAsset = await uploadBufferToCloudinary(request, request.file);

      request.file.path = uploadedAsset.secure_url;
      request.file.cloudinary = {
        publicId: uploadedAsset.public_id,
        assetId: uploadedAsset.asset_id,
        bytes: uploadedAsset.bytes,
        resourceType: uploadedAsset.resource_type,
      };
    } catch (uploadError) {
      return next(uploadError);
    }

    return next();
  });
}

module.exports = handleReportUpload;
