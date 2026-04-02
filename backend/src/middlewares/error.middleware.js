module.exports = (error, request, response, next) => {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  response.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    errors: error.errors || undefined,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
};
