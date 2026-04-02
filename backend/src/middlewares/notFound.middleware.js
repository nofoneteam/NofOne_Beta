const ApiError = require("../utils/apiError");

module.exports = (request, response, next) => {
  next(new ApiError(404, `Route ${request.originalUrl} not found`));
};
