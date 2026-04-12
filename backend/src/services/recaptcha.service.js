const axios = require("axios");
const env = require("../config/env");
const ApiError = require("../utils/apiError");

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_ENTERPRISE_URL =
  "https://recaptchaenterprise.googleapis.com/v1/projects";

/**
 * Verify reCAPTCHA v3 token using Firebase
 * @param {string} token - reCAPTCHA token from frontend
 * @param {string} action - Expected action (signup, login, verify_otp, etc.)
 * @param {number} minScore - Minimum score (0.0 to 1.0) - default 0.5
 * @returns {Promise<Object>} Verification result
 */
async function verifyRecaptchaToken(token, action, minScore = 0.5) {
  if (!token) {
    throw new ApiError(400, "reCAPTCHA token is required");
  }

  if (!env.recaptcha.secretKey) {
    throw new ApiError(
      503,
      "reCAPTCHA secret key is not configured on the server"
    );
  }

  try {
    const response = await axios.post(RECAPTCHA_VERIFY_URL, null, {
      params: {
        secret: env.recaptcha.secretKey,
        response: token,
      },
      timeout: 5000,
    });

    const { success, score, action: returnedAction, challenge_ts } =
      response.data;

    if (!success) {
      console.warn("reCAPTCHA verification failed:", response.data);
      throw new ApiError(
        400,
        "reCAPTCHA verification failed. Please try again."
      );
    }

    if (returnedAction !== action) {
      console.warn(
        `reCAPTCHA action mismatch. Expected: ${action}, Got: ${returnedAction}`
      );
    }

    // Check score (only for reCAPTCHA v3)
    if (score !== undefined && score < minScore) {
      console.warn(
        `reCAPTCHA score too low: ${score} (minimum: ${minScore}).Possible bot activity.`
      );
      throw new ApiError(
        403,
        "Bot activity detected. Please try again later."
      );
    }

    return {
      success: true,
      score,
      action: returnedAction,
      challenge_ts,
      verified: true,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      console.error("reCAPTCHA verification request failed:", error.message);
      throw new ApiError(
        503,
        "reCAPTCHA verification service unavailable"
      );
    }

    throw error;
  }
}

/**
 * Verify reCAPTCHA token with grace period for development/testing
 * Falls through if reCAPTCHA is not configured
 */
async function verifyRecaptchaTokenOptional(token, action, minScore = 0.5) {
  if (!token) {
    // Token not provided - allowed in development
    return {
      success: true,
      verified: false,
      reason: "Token not provided",
    };
  }

  if (!env.recaptcha.secretKey) {
    // Secret key not configured - allowed in development
    return {
      success: true,
      verified: false,
      reason: "reCAPTCHA not configured",
    };
  }

  try {
    return await verifyRecaptchaToken(token, action, minScore);
  } catch (error) {
    if (env.isDevelopment) {
      // In development, allow request to proceed even if reCAPTCHA fails
      console.warn("reCAPTCHA verification skipped in development:", error.message);
      return {
        success: true,
        verified: false,
        reason: "reCAPTCHA verification skipped in development",
      };
    }

    throw error;
  }
}

/**
 * Middleware to verify reCAPTCHA token from request headers or body
 */
function createRecaptchaMiddleware(options = {}) {
  const {
    required = false,
    minScore = 0.5,
    actionName = "request",
  } = options;

  return async (req, res, next) => {
    const token = req.headers["x-recaptcha-token"] || req.body?.recaptchaToken;

    if (required && !token) {
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA token is required",
      });
    }

    try {
      const verifyFn = required
        ? verifyRecaptchaToken
        : verifyRecaptchaTokenOptional;
      const result = await verifyFn(token, actionName, minScore);

      // Attach verification result to request
      req.recaptcha = result;
      next();
    } catch (error) {
      const status = error.statusCode || 400;
      const message = error.message || "reCAPTCHA verification failed";

      res.status(status).json({
        success: false,
        message,
      });
    }
  };
}

module.exports = {
  verifyRecaptchaToken,
  verifyRecaptchaTokenOptional,
  createRecaptchaMiddleware,
};
