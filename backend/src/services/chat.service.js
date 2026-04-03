const ApiError = require("../utils/apiError");
const env = require("../config/env");
const ChatMessageModel = require("../models/chatMessage.model");
const UserModel = require("../models/user.model");
const {
  getFirestore,
  serializeDocument,
  serializeQuerySnapshot,
} = require("../utils/firestore");

async function saveMessage({ userId, message, role, type }) {
  const db = getFirestore();
  const messageRef = db.collection(ChatMessageModel.collectionName).doc();
  const payload = ChatMessageModel.createPayload(messageRef.id, {
    userId,
    message,
    role,
    type,
  });

  await messageRef.set(payload);

  return payload;
}

async function getPreviousMessages(userId, limit = env.chatContextLimit) {
  const db = getFirestore();
  const messagesSnapshot = await db
    .collection(ChatMessageModel.collectionName)
    .where("userId", "==", userId)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();
  const messages = serializeQuerySnapshot(messagesSnapshot);

  // We fetch newest-first for speed, then reverse so any LLM sees the conversation in natural order.
  return messages.reverse();
}

function buildMockAiReply(previousMessages, incomingMessage) {
  const lastAssistantMessage = [...previousMessages].findLast(
    (message) => message.role === "assistant"
  );

  const contextSummary = lastAssistantMessage
    ? ` I also remember our earlier context about: "${lastAssistantMessage.message.slice(0, 120)}".`
    : " I do not have any earlier assistant context yet.";

  return `Mock AI coach reply: I received your ${incomingMessage.type} input saying "${incomingMessage.message}".${contextSummary} When you connect a real LLM, pass the stored conversation history for this user as chat context.`;
}

async function handleChatTurn(userId, payload) {
  const db = getFirestore();
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // This history is scoped to the authenticated user only, so each LLM call can stay personal and private.
  const previousMessages = await getPreviousMessages(userId);
  const userMessage = await saveMessage({
    userId,
    message: payload.message,
    role: "user",
    type: payload.type,
  });

  const assistantReply = buildMockAiReply(previousMessages, payload);
  const assistantMessage = await saveMessage({
    userId,
    message: assistantReply,
    role: "assistant",
    type: "text",
  });

  return {
    userMessage,
    assistantMessage,
    contextMessages: previousMessages,
  };
}

module.exports = {
  saveMessage,
  getPreviousMessages,
  handleChatTurn,
};
