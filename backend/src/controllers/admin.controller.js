const asyncHandler = require("../utils/asyncHandler");
const { bootstrapAdmin } = require("../services/auth.service");
const {
  getAdminOverview,
  searchUsersByEmail,
  listAdmins,
  updateUserRole,
  getChatConfig,
  upsertChatConfig,
} = require("../services/admin.service");

const bootstrapAdminController = asyncHandler(async (request, response) => {
  const user = await bootstrapAdmin(request.user.userId, request.body.bootstrapSecret);

  response.status(200).json({
    success: true,
    message: "Admin access granted successfully",
    data: user,
  });
});

const updateUserRoleController = asyncHandler(async (request, response) => {
  const user = await updateUserRole({
    actor: request.user,
    userId: request.params.userId,
    role: request.body.role,
  });

  response.status(200).json({
    success: true,
    message: "User role updated successfully",
    data: user,
  });
});

const getAdminOverviewController = asyncHandler(async (request, response) => {
  const overview = await getAdminOverview();

  response.status(200).json({
    success: true,
    data: overview,
  });
});

const searchUsersController = asyncHandler(async (request, response) => {
  const users = await searchUsersByEmail(request.query.email);

  response.status(200).json({
    success: true,
    data: { users },
  });
});

const listAdminsController = asyncHandler(async (request, response) => {
  const admins = await listAdmins();

  response.status(200).json({
    success: true,
    data: { admins },
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
  getAdminOverviewController,
  searchUsersController,
  listAdminsController,
  getChatConfigController,
  upsertChatConfigController,
};
