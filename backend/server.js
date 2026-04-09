require("dotenv").config();

const app = require("./src/app");
const env = require("./src/config/env");
const { getRedisClient } = require("./src/utils/redis");

async function startServer() {
  app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port} in ${env.nodeEnv} mode`);
  });

  // Warm the optional Redis connection in the background so the first cache lookup stays fast.
  getRedisClient().catch(() => null);
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
