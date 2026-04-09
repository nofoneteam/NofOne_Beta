const crypto = require("crypto");

const env = require("../config/env");
const { getRedisClient } = require("../utils/redis");

function normalizeCacheText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPreferenceSignature(preferences = []) {
  return preferences
    .map((memory) => normalizeCacheText(memory.content))
    .filter(Boolean)
    .sort()
    .slice(0, env.chatCache.preferenceSignatureLimit)
    .join("|");
}

function buildSharedCacheKey({ payload, preferences = [] }) {
  if (!env.chatCache.enabled || payload.type !== "text") {
    return null;
  }

  const normalizedMessage = normalizeCacheText(payload.message);

  if (!normalizedMessage || normalizedMessage.length < env.chatCache.minPromptLength) {
    return null;
  }

  const signature = buildPreferenceSignature(preferences);
  const rawKey = [payload.type, normalizedMessage, signature || "general"].join("::");
  const digest = crypto.createHash("sha256").update(rawKey).digest("hex");

  return `${env.redis.keyPrefix}:chat:shared:${digest}`;
}

async function getSharedCachedResponse(cacheKey) {
  if (!cacheKey) {
    return null;
  }

  const client = await getRedisClient();

  if (!client) {
    return null;
  }

  const cachedValue = await client.get(cacheKey);

  return cachedValue ? JSON.parse(cachedValue) : null;
}

async function setSharedCachedResponse(cacheKey, value) {
  if (!cacheKey) {
    return;
  }

  const client = await getRedisClient();

  if (!client) {
    return;
  }

  await client.set(cacheKey, JSON.stringify(value), {
    EX: env.chatCache.ttlSeconds,
  });
}

module.exports = {
  buildSharedCacheKey,
  getSharedCachedResponse,
  setSharedCachedResponse,
};
