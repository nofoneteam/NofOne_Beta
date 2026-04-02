const ApiError = require("./apiError");

function normalizeDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Please provide a valid date");
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

module.exports = {
  normalizeDate,
};
