const { buildTimestamps, removeUndefinedValues } = require("./model.utils");

const DEFAULT_CHAT_PREFERENCES = {
  includeRecentMessages: true,
  includeLongTermMemory: true,
  includePreferenceMemory: true,
  includeProfileContext: true,
  includeMedicalReports: true,
};

const UserModel = {
  collectionName: "users",
  defaultChatPreferences: DEFAULT_CHAT_PREFERENCES,

  createPayload(input, existingData = null) {
    return removeUndefinedValues({
      name: input.name || existingData?.name || "User",
      email: input.email ?? existingData?.email ?? null,
      phoneNumber: input.phoneNumber ?? existingData?.phoneNumber ?? null,
      firebaseUid: input.firebaseUid ?? existingData?.firebaseUid ?? null,
      authProvider: input.authProvider || existingData?.authProvider,
      role: input.role || existingData?.role || "user",
      onboarded: input.onboarded ?? existingData?.onboarded ?? false,
      chatPreferences: {
        ...DEFAULT_CHAT_PREFERENCES,
        ...(existingData?.chatPreferences || {}),
        ...(input.chatPreferences || {}),
      },
      ...buildTimestamps(existingData),
    });
  },
};

module.exports = UserModel
