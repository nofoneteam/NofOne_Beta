const crypto = require("crypto");

const { removeUndefinedValues } = require("./model.utils");

const OtpCodeModel = {
  collectionName: "otpCodes",

  createDocumentId(channel, identifier, purpose) {
    const identifierHash = crypto
      .createHash("sha256")
      .update(`${channel}:${identifier}:${purpose}`)
      .digest("hex");

    return `${purpose}_${channel}_${identifierHash}`;
  },

  createPayload(input) {
    return removeUndefinedValues({
      channel: input.channel,
      identifier: input.identifier,
      otpHash: input.otpHash,
      purpose: input.purpose,
      expiresAt: input.expiresAt,
      attempts: input.attempts ?? 0,
      verifiedAt: input.verifiedAt ?? null,
      metadata: {
        name: input.metadata?.name ?? null,
      },
      createdAt: input.createdAt || new Date().toISOString(),
    });
  },
};

module.exports = OtpCodeModel;
