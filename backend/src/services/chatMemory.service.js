const { Embeddings } = require("@langchain/core/embeddings");

const env = require("../config/env");
const ChatMemoryModel = require("../models/chatMemory.model");
const ChatMessageModel = require("../models/chatMessage.model");
const UserModel = require("../models/user.model");
const {
  getFirestore,
  serializeQuerySnapshot,
} = require("../utils/firestore");

class LocalHashEmbeddings extends Embeddings {
  constructor(size = env.chatMemory.embeddingDimensions) {
    super({});
    this.size = size;
  }

  async embedDocuments(documents) {
    return Promise.all(documents.map((document) => this.embedQuery(document)));
  }

  async embedQuery(document) {
    const vector = new Array(this.size).fill(0);
    const normalized = normalizeForEmbedding(document);

    if (!normalized) {
      return vector;
    }

    const tokens = normalized.split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      const index = hashToken(token, this.size);
      vector[index] += 1;
    }

    return normalizeVector(vector);
  }
}

const embeddings = new LocalHashEmbeddings();

function normalizeForEmbedding(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashToken(token, size) {
  let hash = 0;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }

  return hash % size;
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  );

  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

function cosineSimilarity(first, second) {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length !== second.length
  ) {
    return 0;
  }

  let score = 0;

  for (let index = 0; index < first.length; index += 1) {
    score += first[index] * second[index];
  }

  return score;
}

function buildPreferenceCandidates(message = "") {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return [];
  }

  const patterns = [
    /\b(?:i prefer|please answer in|respond in|keep answers|i like)\s+(.+?)(?:[.!?]|$)/gi,
    /\b(?:my goal is|i want to|i am trying to)\s+(.+?)(?:[.!?]|$)/gi,
    /\b(?:i am|i'm)\s+(.+?)(?:[.!?]|$)/gi,
    /\b(?:call me)\s+(.+?)(?:[.!?]|$)/gi,
  ];
  const candidates = new Set();

  for (const pattern of patterns) {
    let match = pattern.exec(trimmedMessage);

    while (match) {
      const candidate = match[1].trim().replace(/\s+/g, " ");

      if (candidate.length >= 3 && candidate.length <= 180) {
        candidates.add(candidate);
      }

      match = pattern.exec(trimmedMessage);
    }
  }

  return Array.from(candidates).slice(0, env.chatMemory.maxPreferenceFacts);
}

async function saveChatMemory({
  userId,
  kind,
  role = null,
  content,
  metadata = null,
}) {
  const normalizedContent = String(content || "").trim();

  if (!normalizedContent) {
    return null;
  }

  const db = getFirestore();
  const memoryRef = db
    .collection(UserModel.collectionName)
    .doc(userId)
    .collection(ChatMemoryModel.collectionName)
    .doc();
  // These embeddings are generated locally so semantic recall adds no extra model-provider token cost.
  const embedding = await embeddings.embedQuery(normalizedContent);
  const payload = ChatMemoryModel.createPayload(memoryRef.id, {
    userId,
    kind,
    role,
    content: normalizedContent,
    embedding,
    metadata,
  });

  await memoryRef.set(payload);

  return payload;
}

async function persistMessageMemory(userId, message) {
  if (!message?.message?.trim()) {
    return;
  }

  await saveChatMemory({
    userId,
    kind: "chat_turn",
    role: message.role,
    content: message.message,
    metadata: {
      messageId: message.id,
      type: message.type || "text",
    },
  });
}

async function persistPreferenceMemories(userId, message, sourceMessageId) {
  const candidates = buildPreferenceCandidates(message);

  await Promise.all(
    candidates.map((candidate) =>
      saveChatMemory({
        userId,
        kind: "user_preference",
        role: "user",
        content: candidate,
        metadata: {
          sourceMessageId,
        },
      })
    )
  );

  return candidates;
}

async function getRecentMessages(userId, limit = env.chatMemory.recentMessageWindow) {
  const db = getFirestore();
  const messagesSnapshot = await db
    .collection(UserModel.collectionName)
    .doc(userId)
    .collection(ChatMessageModel.collectionName)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return serializeQuerySnapshot(messagesSnapshot).reverse();
}

async function getMemoryContext(userId, query) {
  const db = getFirestore();
  const [memorySnapshot, recentMessages] = await Promise.all([
    db
      .collection(UserModel.collectionName)
      .doc(userId)
      .collection(ChatMemoryModel.collectionName)
      .orderBy("timestamp", "desc")
      .limit(env.chatMemory.maxMemoryRecords)
      .get(),
    getRecentMessages(userId),
  ]);
  const memories = serializeQuerySnapshot(memorySnapshot);
  const queryEmbedding = await embeddings.embedQuery(query);
  const semanticMemories = memories
    .filter(
      (memory) =>
        (memory.kind === ChatMemoryModel.kinds.chatTurn && memory.role === "user") ||
        memory.kind === ChatMemoryModel.kinds.medicalReport
    )
    .map((memory) => ({
      ...memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding),
    }))
    .filter((memory) => memory.score >= env.chatMemory.minSimilarityScore)
    .sort((first, second) => second.score - first.score)
    .slice(0, env.chatMemory.semanticRecallLimit);
  const preferenceMemories = memories
    .filter((memory) => memory.kind === ChatMemoryModel.kinds.userPreference)
    .slice(0, env.chatMemory.maxPreferenceFacts);
  const uniquePreferences = Array.from(
    new Map(
      preferenceMemories.map((memory) => [memory.content.toLowerCase(), memory])
    ).values()
  );

  return {
    recentMessages,
    semanticMemories,
    preferenceMemories: uniquePreferences,
  };
}

function buildPromptMemoryBlock({ preferenceMemories, semanticMemories }) {
  const sections = [];
  const compactPreferences = preferenceMemories
    .slice(0, env.chatMemory.promptMemoryItems)
    .map((memory) =>
      memory.content.slice(0, env.chatMemory.promptSnippetChars).trim()
    )
    .filter(Boolean);
  const compactSemantic = semanticMemories
    .slice(0, env.chatMemory.promptMemoryItems)
    .map((memory) =>
      memory.content.slice(0, env.chatMemory.promptSnippetChars).trim()
    )
    .filter(Boolean);

  if (compactPreferences.length > 0) {
    sections.push(`Prefs: ${compactPreferences.join("; ")}`);
  }

  if (compactSemantic.length > 0) {
    sections.push(`Recall: ${compactSemantic.join("; ")}`);
  }

  return sections.join("\n\n").trim();
}

module.exports = {
  buildPromptMemoryBlock,
  getMemoryContext,
  persistMessageMemory,
  persistPreferenceMemories,
  saveChatMemory,
};
