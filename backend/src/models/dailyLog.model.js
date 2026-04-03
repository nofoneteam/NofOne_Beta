const { buildTimestamps, removeUndefinedValues } = require("./model.utils");

const DailyLogModel = {
  collectionName: "dailyLogs",

  createDocumentId(userId, normalizedDate) {
    return `${userId}_${normalizedDate.toISOString().slice(0, 10)}`;
  },

  createPayload(userId, input, normalizedDate, existingData = null) {
    return removeUndefinedValues({
      userId,
      date: normalizedDate.toISOString(),
      calories: input.calories ?? existingData?.calories ?? 0,
      protein: input.protein ?? existingData?.protein ?? 0,
      carbs: input.carbs ?? existingData?.carbs ?? 0,
      fat: input.fat ?? existingData?.fat ?? 0,
      waterIntake: input.waterIntake ?? existingData?.waterIntake ?? 0,
      exerciseCalories:
        input.exerciseCalories ?? existingData?.exerciseCalories ?? 0,
      ...buildTimestamps(existingData),
    });
  },
};

module.exports = DailyLogModel;
