const { removeUndefinedValues } = require("./model.utils");

const ChatMessageModel = {
  collectionName: "chatMessages",

  createPayload(id, input) {
    return removeUndefinedValues({
      id,
      userId: input.userId,
      message: input.message,
      role: input.role,
      type: input.type,
      metadata: input.metadata ?? null,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = ChatMessageModel;
