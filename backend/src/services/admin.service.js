const ApiError = require("../utils/apiError");
const ChatConfigModel = require("../models/chatConfig.model");
const { getFirestore, serializeDocument } = require("../utils/firestore");
const { getRedisClient } = require("../utils/redis");
const env = require("../config/env");

function getChatConfigCacheKey() {
  return `${env.redis.keyPrefix}:chat:config:${ChatConfigModel.documentId}`;
}

async function getChatConfig() {
  const db = getFirestore();
  const snapshot = await db
    .collection(ChatConfigModel.collectionName)
    .doc(ChatConfigModel.documentId)
    .get();

  return serializeDocument(snapshot);
}

async function upsertChatConfig(payload) {
  const db = getFirestore();
  const ref = db
    .collection(ChatConfigModel.collectionName)
    .doc(ChatConfigModel.documentId);
  const existing = await ref.get();

  await ref.set(
    {
      systemPrompt: payload.systemPrompt ?? existing.data()?.systemPrompt ?? null,
      imageSystemPrompt:
        payload.imageSystemPrompt ?? existing.data()?.imageSystemPrompt ?? null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const config = serializeDocument(await ref.get());
  const redisClient = await getRedisClient();

  if (redisClient) {
    await redisClient.set(getChatConfigCacheKey(), JSON.stringify(config), {
      EX: env.chatConfig.redisTtlSeconds,
    });
  }

  return config;
}

async function ensureChatConfigExists() {
  const config = await getChatConfig();

  if (!config) {
    throw new ApiError(404, "Chat config not found");
  }

  return config;
}

module.exports = {
  getChatConfig,
  upsertChatConfig,
  ensureChatConfigExists,
};
