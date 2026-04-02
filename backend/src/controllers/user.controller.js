const asyncHandler = require("../utils/asyncHandler");
const {
  upsertHealthProfile,
  getHealthProfile,
} = require("../services/user.service");

const createOrUpdateProfile = asyncHandler(async (request, response) => {
  const profile = await upsertHealthProfile(request.user.userId, request.body);

  response.status(200).json({
    success: true,
    message: "Health profile saved successfully",
    data: profile,
  });
});

const getProfile = asyncHandler(async (request, response) => {
  const profile = await getHealthProfile(request.user.userId);

  response.status(200).json({
    success: true,
    data: profile,
  });
});

module.exports = {
  createOrUpdateProfile,
  getProfile,
};
