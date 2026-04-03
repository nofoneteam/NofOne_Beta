const { removeUndefinedValues } = require("./model.utils");

const SessionModel = {
  collectionName: "sessions",

  createPayload(input) {
    return removeUndefinedValues({
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      revokedAt: input.revokedAt ?? null,
      replacedByTokenHash: input.replacedByTokenHash ?? null,
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    });
  },
};

module.exports = SessionModel;
