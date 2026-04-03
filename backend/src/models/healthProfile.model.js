const { buildTimestamps, removeUndefinedValues } = require("./model.utils");

const HealthProfileModel = {
  collectionName: "healthProfiles",

  createPayload(userId, input, existingData = null) {
    return removeUndefinedValues({
      userId,
      age: input.age,
      height: input.height,
      weight: input.weight,
      goal: input.goal,
      activityLevel: input.activityLevel,
      ...buildTimestamps(existingData),
    });
  },
};

module.exports = HealthProfileModel;
