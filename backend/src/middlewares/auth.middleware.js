const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const UserModel = require("../models/user.model");
const { getFirestore, serializeDocument } = require("../utils/firestore");
const { getAccessTokenFromRequest } = require("../utils/cookies");

module.exports = asyncHandler(async (request, response, next) => {
  // Protected routes accept either a Bearer token or the HTTP-only access token cookie.
  const token = getAccessTokenFromRequest(request);

  if (!token) {
    throw new ApiError(401, "Access token is required");
  }
  const decodedToken = jwt.verify(token, env.jwtSecret);

  if (decodedToken.tokenType && decodedToken.tokenType !== "access") {
    throw new ApiError(401, "Invalid access token");
  }

  const db = getFirestore();
  const userSnapshot = await db
    .collection(UserModel.collectionName)
    .doc(decodedToken.sub)
    .get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(401, "Authenticated user no longer exists");
  }

  request.user = {
    userId: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    authProvider: user.authProvider,
    name: user.name,
    role: user.role || "user",
  };

  next();
});
