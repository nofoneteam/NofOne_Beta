const asyncHandler = require("../utils/asyncHandler");
const {
  upsertHealthProfile,
  getHealthProfile,
  generateProfileAiSuggestion,
  getUserChatPreferences,
  updateUserChatPreferences,
} = require("../services/user.service");
const {
  createMedicalReport,
  listMedicalReports,
} = require("../services/medicalReport.service");

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

const uploadReport = asyncHandler(async (request, response) => {
  const report = await createMedicalReport(
    request.user.userId,
    request.file,
    request.body.title
  );

  response.status(201).json({
    success: true,
    message: "Medical report uploaded successfully",
    data: report,
  });
});

const getReports = asyncHandler(async (request, response) => {
  const reports = await listMedicalReports(request.user.userId);

  response.status(200).json({
    success: true,
    data: { reports },
  });
});

const generateAiProfileSuggestion = asyncHandler(async (request, response) => {
  const result = await generateProfileAiSuggestion(
    request.user.userId,
    request.body.note
  );

  response.status(200).json({
    success: true,
    data: result,
  });
});

const getChatPreferences = asyncHandler(async (request, response) => {
  const preferences = await getUserChatPreferences(request.user.userId);

  response.status(200).json({
    success: true,
    data: preferences,
  });
});

const updateChatPreferences = asyncHandler(async (request, response) => {
  const preferences = await updateUserChatPreferences(
    request.user.userId,
    request.body
  );

  response.status(200).json({
    success: true,
    message: "Chat preferences updated successfully",
    data: preferences,
  });
});

module.exports = {
  createOrUpdateProfile,
  getProfile,
  uploadReport,
  getReports,
  generateAiProfileSuggestion,
  getChatPreferences,
  updateChatPreferences,
};
