const env = require("../config/env");
const ChatMessageModel = require("../models/chatMessage.model");
const UserModel = require("../models/user.model");
const {
  isHealthDomainRequest,
  isAbusiveMessage,
  isAbusiveOrNonsensicalMessage,
  messageNeedsConversationContext,
  hasDisallowedAssistantTone,
  buildHealthDomainRefusal,
  buildAbusiveLanguageRefusal,
  buildInvalidMessageRefusal,
  shouldKeepReplyFocusedOnCurrentMessage,
} = require("../utils/healthGuard");
const {
  generateHealthAssistantReply,
} = require("./healthChatAgent.service");
const {
  buildPromptMemoryBlock,
  getMemoryContext,
  persistMessageMemory,
  persistPreferenceMemories,
} = require("./chatMemory.service");
const { getUserContextSummary } = require("./userContext.service");
const {
  buildSharedCacheKey,
  getSharedCachedResponse,
  setSharedCachedResponse,
} = require("./chatCache.service");
const { getUserChatPreferences } = require("./user.service");
const {
  getFirestore,
  serializeQuerySnapshot,
} = require("../utils/firestore");

function getRequestCacheSignature(payload, normalizedUserMessage) {
  if (payload.type === "image") {
    return `${payload.type}:${normalizedUserMessage.trim().toLowerCase()}:${
      payload.imageUrl || ""
    }`;
  }

  return `${payload.type}:${normalizedUserMessage.trim().toLowerCase()}`;
}

function findCachedAssistantReply(recentMessages, payload, normalizedUserMessage) {
  const requestSignature = getRequestCacheSignature(payload, normalizedUserMessage);

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const message = recentMessages[index];

    if (
      message.role === "user" &&
      getRequestCacheSignature(
        {
          type: message.type,
          message: message.message,
          imageUrl: message.metadata?.imageUrl,
        },
        message.message
      ) === requestSignature
    ) {
      const nextMessage = recentMessages[index + 1];

      if (nextMessage?.role === "assistant" && nextMessage.message?.trim()) {
        return nextMessage.message.trim();
      }
    }
  }

  return null;
}

function toPublicMemory(memory) {
  if (!memory) {
    return null;
  }

  return {
    id: memory.id,
    kind: memory.kind,
    role: memory.role,
    content: memory.content,
    metadata: memory.metadata ?? null,
    timestamp: memory.timestamp,
    score: memory.score ?? null,
  };
}

async function saveMessage({ userId, message, role, type, metadata = null }) {
  const db = getFirestore();
  // Chat history lives under each user document so context reads stay naturally scoped to one user.
  const messageRef = db
    .collection(UserModel.collectionName)
    .doc(userId)
    .collection(ChatMessageModel.collectionName)
    .doc();
  const payload = ChatMessageModel.createPayload(messageRef.id, {
    userId,
    message,
    role,
    type,
    metadata,
  });

  await messageRef.set(payload);

  return payload;
}

async function getPreviousMessages(userId, limit = env.chatContextLimit) {
  const db = getFirestore();
  const messagesSnapshot = await db
    .collection(UserModel.collectionName)
    .doc(userId)
    .collection(ChatMessageModel.collectionName)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();
  const messages = serializeQuerySnapshot(messagesSnapshot);

  // We fetch newest-first for speed, then reverse so any LLM sees the conversation in natural order.
  return messages.reverse();
}

async function getMessagesByDate(userId, dateString) {
  const db = getFirestore();
  
  // Create UTC bounds for the requested date (YYYY-MM-DD)
  const [year, month, day] = dateString.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();

  const messagesSnapshot = await db
    .collection(UserModel.collectionName)
    .doc(userId)
    .collection(ChatMessageModel.collectionName)
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<=", endOfDay)
    .orderBy("timestamp", "asc")
    .get();

  return serializeQuerySnapshot(messagesSnapshot);
}

async function handleChatTurn(userId, payload) {
  const normalizedUserMessage =
    payload.message ||
    "Please analyze this image for meal composition, calories, macros, or fitness relevance only.";
  const chatPreferences = await getUserChatPreferences(userId);
  const needsContextForThisTurn =
    payload.type === "image" || messageNeedsConversationContext(normalizedUserMessage);
  const forceCurrentMessageOnly = shouldKeepReplyFocusedOnCurrentMessage(
    normalizedUserMessage
  );
  const shouldUseConversationContext =
    (!forceCurrentMessageOnly &&
      payload.type === "image") ||
    (!forceCurrentMessageOnly &&
      chatPreferences.includeRecentMessages &&
      needsContextForThisTurn);
  const shouldLoadMemoryContext =
    !forceCurrentMessageOnly &&
    needsContextForThisTurn &&
    (shouldUseConversationContext ||
      chatPreferences.includeLongTermMemory ||
      chatPreferences.includePreferenceMemory ||
      chatPreferences.includeMedicalReports);
  // We only retrieve recent history and memory for clear follow-up turns so standalone questions stay focused on the current message.
  const [memoryContext, userContextSummary] = await Promise.all([
    shouldLoadMemoryContext
      ? getMemoryContext(userId, normalizedUserMessage)
      : Promise.resolve({
          recentMessages: [],
          semanticMemories: [],
          preferenceMemories: [],
        }),
    chatPreferences.includeProfileContext
      ? getUserContextSummary(userId)
      : Promise.resolve(""),
  ]);
  const filteredMemoryContext = {
    recentMessages: chatPreferences.includeRecentMessages
      ? memoryContext.recentMessages
      : [],
    preferenceMemories: chatPreferences.includePreferenceMemory
      ? memoryContext.preferenceMemories
      : [],
    semanticMemories: memoryContext.semanticMemories.filter((memory) => {
      if (memory.kind === "medical_report") {
        return chatPreferences.includeMedicalReports;
      }

      if (memory.kind === "chat_turn") {
        return chatPreferences.includeLongTermMemory;
      }

      return false;
    }),
  };
  const userMessage = await saveMessage({
    userId,
    message: normalizedUserMessage,
    role: "user",
    type: payload.type,
    metadata: payload.imageUrl
      ? {
          imageUrl: payload.imageUrl,
        }
      : null,
  });
  const isAbusiveInput = isAbusiveMessage(normalizedUserMessage);
  const isInvalidInput =
    !isAbusiveInput && isAbusiveOrNonsensicalMessage(normalizedUserMessage);

  const cachedAssistantReply =
    payload.type === "image" || isAbusiveInput || isInvalidInput
      ? null
        : findCachedAssistantReply(
          filteredMemoryContext.recentMessages,
          payload,
          normalizedUserMessage
        );
  const isHealthRequest = isHealthDomainRequest(
    { ...payload, message: normalizedUserMessage },
    filteredMemoryContext.recentMessages
  );
  const sharedCacheKey =
    !cachedAssistantReply && isHealthRequest
      ? buildSharedCacheKey({
          payload: {
            ...payload,
            message: normalizedUserMessage,
          },
          preferences: filteredMemoryContext.preferenceMemories,
        })
      : null;
  const sharedCachedResponse =
    !cachedAssistantReply && sharedCacheKey
      ? await getSharedCachedResponse(sharedCacheKey)
      : null;
  const rawAssistantReply = isAbusiveInput
    ? buildAbusiveLanguageRefusal()
    : isInvalidInput
    ? buildInvalidMessageRefusal()
    : cachedAssistantReply
      ? cachedAssistantReply
      : sharedCachedResponse?.message
        ? sharedCachedResponse.message
        : isHealthRequest
          ? await generateHealthAssistantReply(
              {
                recentMessages: filteredMemoryContext.recentMessages,
                memoryBlock: buildPromptMemoryBlock(filteredMemoryContext),
                userContextSummary,
              },
              {
                ...payload,
                message: normalizedUserMessage,
              }
            )
          : buildHealthDomainRefusal();
  const assistantReply = hasDisallowedAssistantTone(rawAssistantReply)
    ? buildInvalidMessageRefusal()
    : rawAssistantReply;
  const assistantMessage = await saveMessage({
    userId,
    message: assistantReply,
    role: "assistant",
    type: "text",
  });
  if (!cachedAssistantReply && !sharedCachedResponse?.message && sharedCacheKey) {
    setSharedCachedResponse(sharedCacheKey, {
      message: assistantReply,
      createdAt: new Date().toISOString(),
    }).catch(() => null);
  }
  Promise.allSettled([
    persistMessageMemory(userId, userMessage),
    persistPreferenceMemories(userId, normalizedUserMessage, userMessage.id),
    persistMessageMemory(userId, assistantMessage),
  ]);

  const response = {
    userMessage,
    assistantMessage,
    responseSource: cachedAssistantReply
      ? "session_cache"
      : sharedCachedResponse?.message
        ? "shared_cache"
        : isAbusiveInput || isInvalidInput
          ? "refusal"
        : isHealthRequest
          ? "model"
          : "refusal",
  };

  if (env.chatCache.includeDebugResponse || payload.includeDebug === true) {
    response.contextMessages = filteredMemoryContext.recentMessages;
    response.recalledMemories = {
      preferences: filteredMemoryContext.preferenceMemories.map(toPublicMemory),
      semantic: filteredMemoryContext.semanticMemories.map(toPublicMemory),
    };
  }

  return response;
}

module.exports = {
  saveMessage,
  getPreviousMessages,
  getMessagesByDate,
  handleChatTurn,
};
