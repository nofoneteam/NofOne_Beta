const { buildTimestamps, removeUndefinedValues } = require("./model.utils");

const UserModel = {
  collectionName: "users",

  createPayload(input, existingData = null) {
    return removeUndefinedValues({
      name: input.name || existingData?.name || "User",
      email: input.email ?? existingData?.email ?? null,
      phoneNumber: input.phoneNumber ?? existingData?.phoneNumber ?? null,
      firebaseUid: input.firebaseUid ?? existingData?.firebaseUid ?? null,
      authProvider: input.authProvider || existingData?.authProvider,
      onboarded: input.onboarded ?? existingData?.onboarded ?? false,
      ...buildTimestamps(existingData),
    });
  },
};

module.exports = UserModel
