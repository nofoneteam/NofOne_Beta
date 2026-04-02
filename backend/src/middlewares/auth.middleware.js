const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const collections = require("../models/collections");
const { getFirestore, serializeDocument } = require("../utils/firestore");

module.exports = asyncHandler(async (request, response, next) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token is required");
  }

  const token = authHeader.split(" ")[1];
  const decodedToken = jwt.verify(token, env.jwtSecret);

  if (decodedToken.tokenType && decodedToken.tokenType !== "access") {
    throw new ApiError(401, "Invalid access token");
  }

  const db = getFirestore();
  const userSnapshot = await db
    .collection(collections.users)
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
  };

  next();
});
