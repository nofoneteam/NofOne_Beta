const { validationResult } = require("express-validator");

module.exports = (request, response, next) => {
  const errors = validationResult(request);

  if (errors.isEmpty()) {
    return next();
  }

  console.error("VALIDATION ERRORS:", errors.array().map(e => e.path + ": " + e.msg)); return response.status(400).json({
    success: false,
    message: "Validation failed: " + errors.array().map(e => e.path).join(", "),
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
};
