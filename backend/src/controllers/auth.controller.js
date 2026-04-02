const asyncHandler = require("../utils/asyncHandler");
const {
  requestOtp,
  verifyOtpAndLogin,
  loginWithGoogle,
  rotateRefreshToken,
  revokeRefreshSession,
  getUserById,
} = require("../services/auth.service");

function getRequestMeta(request) {
  return {
    userAgent: request.headers["user-agent"],
    ipAddress: request.ip,
  };
}

const getAuthenticatedUser = asyncHandler(async (request, response) => {
  const user = await getUserById(request.user.userId);

  response.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

const requestOtpController = asyncHandler(async (request, response) => {
  const result = await requestOtp(request.body);

  response.status(200).json({
    success: true,
    message: "OTP sent successfully",
    data: result,
  });
});

const verifyOtpController = asyncHandler(async (request, response) => {
  const result = await verifyOtpAndLogin(request.body, getRequestMeta(request));

  response.status(200).json({
    success: true,
    message: "OTP verified successfully",
    data: result,
  });
});

const googleLoginController = asyncHandler(async (request, response) => {
  const result = await loginWithGoogle(request.body, getRequestMeta(request));

  response.status(200).json({
    success: true,
    message: "Google sign-in successful",
    data: result,
  });
});

const refreshSessionController = asyncHandler(async (request, response) => {
  const result = await rotateRefreshToken(
    request.body.refreshToken,
    getRequestMeta(request)
  );

  response.status(200).json({
    success: true,
    message: "Session refreshed successfully",
    data: result,
  });
});

const logoutController = asyncHandler(async (request, response) => {
  await revokeRefreshSession(request.body.refreshToken);

  response.status(200).json({
    success: true,
    message: "Session logged out successfully",
  });
});

module.exports = {
  getAuthenticatedUser,
  requestOtpController,
  verifyOtpController,
  googleLoginController,
  refreshSessionController,
  logoutController,
};
