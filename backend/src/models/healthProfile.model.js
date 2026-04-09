const { buildTimestamps, removeUndefinedValues } = require("./model.utils");

const HealthProfileModel = {
  collectionName: "healthProfiles",

  createPayload(userId, input, existingData = null) {
    return removeUndefinedValues({
      userId,
      age: input.age ?? existingData?.age,
      gender: input.gender ?? existingData?.gender ?? null,
      height: input.height ?? existingData?.height,
      weight: input.weight ?? existingData?.weight,
      targetWeight: input.targetWeight ?? existingData?.targetWeight ?? null,
      bmi: input.bmi ?? existingData?.bmi ?? null,
      bmiCategory: input.bmiCategory ?? existingData?.bmiCategory ?? null,
      location: input.location ?? existingData?.location ?? null,
      city: input.city ?? existingData?.city ?? null,
      ethnicityCuisine:
        input.ethnicityCuisine ?? existingData?.ethnicityCuisine ?? null,
      activityLevel: input.activityLevel ?? existingData?.activityLevel,
      goal: input.goal ?? existingData?.goal,
      dietType: input.dietType ?? existingData?.dietType ?? null,
      diabetes: input.diabetes ?? existingData?.diabetes ?? null,
      hypertension: input.hypertension ?? existingData?.hypertension ?? null,
      cholesterol: input.cholesterol ?? existingData?.cholesterol ?? null,
      cancerSurvivor:
        input.cancerSurvivor ?? existingData?.cancerSurvivor ?? null,
      hrt: input.hrt ?? existingData?.hrt ?? null,
      otherConditions:
        input.otherConditions ?? existingData?.otherConditions ?? null,
      allergies: input.allergies ?? existingData?.allergies ?? [],
      foodDislikes: input.foodDislikes ?? existingData?.foodDislikes ?? [],
      aiNotes: input.aiNotes ?? existingData?.aiNotes ?? [],
      ...buildTimestamps(existingData),
    });
  },
};

module.exports = HealthProfileModel;
