const { removeUndefinedValues } = require("./model.utils");

const ChatMemoryModel = {
  collectionName: "chatMemories",
  kinds: {
    chatTurn: "chat_turn",
    userPreference: "user_preference",
    medicalReport: "medical_report",
  },

  createPayload(id, input) {
    return removeUndefinedValues({
      id,
      userId: input.userId,
      kind: input.kind,
      role: input.role ?? null,
      content: input.content,
      embedding: input.embedding,
      metadata: input.metadata ?? null,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = ChatMemoryModel;
