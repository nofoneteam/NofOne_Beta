const asyncHandler = require("../utils/asyncHandler");
const { bootstrapAdmin, setUserRole } = require("../services/auth.service");
const { getChatConfig, upsertChatConfig } = require("../services/admin.service");

const bootstrapAdminController = asyncHandler(async (request, response) => {
  const user = await bootstrapAdmin(request.user.userId, request.body.bootstrapSecret);

  response.status(200).json({
    success: true,
    message: "Admin access granted successfully",
    data: user,
  });
});

const updateUserRoleController = asyncHandler(async (request, response) => {
  const user = await setUserRole(request.params.userId, request.body.role);

  response.status(200).json({
    success: true,
    message: "User role updated successfully",
    data: user,
  });
});

const getChatConfigController = asyncHandler(async (request, response) => {
  const config = await getChatConfig();

  response.status(200).json({
    success: true,
    data: config,
  });
});

const upsertChatConfigController = asyncHandler(async (request, response) => {
  const config = await upsertChatConfig(request.body);

  response.status(200).json({
    success: true,
    message: "Chat system prompt updated successfully",
    data: config,
  });
});

module.exports = {
  bootstrapAdminController,
  updateUserRoleController,
  getChatConfigController,
  upsertChatConfigController,
};
