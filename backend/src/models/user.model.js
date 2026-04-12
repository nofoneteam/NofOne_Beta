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
      referralCode: input.referralCode ?? existingData?.referralCode ?? null,
      referredByUserId:
        input.referredByUserId ?? existingData?.referredByUserId ?? null,
      referredByCode:
        input.referredByCode ?? existingData?.referredByCode ?? null,
      referredAt: input.referredAt ?? existingData?.referredAt ?? null,
      referralCount: input.referralCount ?? existingData?.referralCount ?? 0,
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
