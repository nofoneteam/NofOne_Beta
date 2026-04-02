module.exports = (request, response, next) => {
  const startTime = Date.now();

  response.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `${request.method} ${request.originalUrl} ${response.statusCode} - ${duration}ms`
    );
  });

  next();
};
