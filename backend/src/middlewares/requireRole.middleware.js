const ApiError = require("../utils/apiError");

function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user?.role || !roles.includes(request.user.role)) {
      return next(new ApiError(403, "You do not have access to this resource"));
    }

    return next();
  };
}

module.exports = requireRole;
