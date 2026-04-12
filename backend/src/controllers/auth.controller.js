const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const {
  requestSignupOtp,
  requestLoginOtp,
  verifySignupOtp,
  verifyLoginOtp,
  loginWithGoogle,
  loginWithPhone,
  rotateRefreshToken,
  revokeRefreshSession,
  getUserById,
} = require("../services/auth.service");
const {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
} = require("../utils/cookies");

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

const requestSignupOtpController = asyncHandler(async (request, response) => {
  const result = await requestSignupOtp(request.body);

  response.status(200).json({
    success: true,
    message: "Signup OTP sent successfully",
    data: result,
  });
});

const verifySignupOtpController = asyncHandler(async (request, response) => {
  const result = await verifySignupOtp(request.body, getRequestMeta(request));
  setAuthCookies(response, result);

  response.status(200).json({
    success: true,
    message: "Signup completed successfully",
    data: result,
  });
});

const requestLoginOtpController = asyncHandler(async (request, response) => {
  const result = await requestLoginOtp(request.body);

  response.status(200).json({
    success: true,
    message: "Login OTP sent successfully",
    data: result,
  });
});

const verifyLoginOtpController = asyncHandler(async (request, response) => {
  const result = await verifyLoginOtp(request.body, getRequestMeta(request));
  setAuthCookies(response, result);

  response.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
});

const googleLoginController = asyncHandler(async (request, response) => {
  const result = await loginWithGoogle(request.body, getRequestMeta(request));
  setAuthCookies(response, result);

  response.status(200).json({
    success: true,
    message: "Google sign-in successful",
    data: result,
  });
});

const phoneLoginController = asyncHandler(async (request, response) => {
  const result = await loginWithPhone(request.body, getRequestMeta(request));
  setAuthCookies(response, result);

  response.status(200).json({
    success: true,
    message: "Phone sign-in successful",
    data: result,
  });
});

const refreshSessionController = asyncHandler(async (request, response) => {
  const refreshToken = getRefreshTokenFromRequest(request);

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required in either cookies or request body");
  }

  const result = await rotateRefreshToken(
    refreshToken,
    getRequestMeta(request)
  );
  setAuthCookies(response, result);

  response.status(200).json({
    success: true,
    message: "Session refreshed successfully",
    data: result,
  });
});

const logoutController = asyncHandler(async (request, response) => {
  const refreshToken = getRefreshTokenFromRequest(request);

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required in either cookies or request body");
  }

  await revokeRefreshSession(refreshToken);
  clearAuthCookies(response);

  response.status(200).json({
    success: true,
    message: "Session logged out successfully",
  });
});

module.exports = {
  getAuthenticatedUser,
  requestSignupOtpController,
  verifySignupOtpController,
  requestLoginOtpController,
  verifyLoginOtpController,
  googleLoginController,
  phoneLoginController,
  refreshSessionController,
  logoutController,
};
