require("dotenv").config();

const app = require("./src/app");
const env = require("./src/config/env");

async function startServer() {
  app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port} in ${env.nodeEnv} mode`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
