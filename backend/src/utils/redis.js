const env = require("../config/env");

let redisClientPromise;

async function createRedisClient() {
  if (!env.redis.url) {
    return null;
  }

  const { createClient } = require("redis");
  const client = createClient({
    url: env.redis.url,
    socket: {
      connectTimeout: env.redis.connectTimeoutMs,
    },
  });

  client.on("error", (error) => {
    console.error("Redis client error:", error.message);
  });

  await client.connect();

  return client;
}

async function getRedisClient() {
  if (!env.redis.enabled) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = createRedisClient().catch((error) => {
      redisClientPromise = null;
      console.error("Failed to initialize Redis:", error.message);
      return null;
    });
  }

  return redisClientPromise;
}

module.exports = {
  getRedisClient,
};
