const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const logRoutes = require("./routes/log.routes");
const chatRoutes = require("./routes/chat.routes");
const adminRoutes = require("./routes/admin.routes");
const requestLogger = require("./middlewares/requestLogger.middleware");
const rateLimiter = require("./middlewares/rateLimiter.middleware");
const notFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/error.middleware");

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.length === 0 || env.clientUrls.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(rateLimiter);

app.get("/health", (request, response) => {
  response.status(200).json({
    success: true,
    message: "Server is healthy",
    environment: env.nodeEnv,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.get("/test" , (req, res)=>{
  res.json({message: "Test route is working!"});
})

app.use(notFound);
app.use(errorHandler);

module.exports = app;
