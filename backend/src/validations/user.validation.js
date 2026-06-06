const { body } = require("express-validator");

const healthProfileRules = [
  body("age").optional({ nullable: true }),
  body("gender").optional({ nullable: true }),
  body("height").optional({ nullable: true }),
  body("weight").optional({ nullable: true }),
  body("targetWeight").optional({ nullable: true }),
  body("targetCalories").optional({ nullable: true }),
  body("targetBurn").optional({ nullable: true }),
  body("targetCarbs").optional({ nullable: true }),
  body("targetProtein").optional({ nullable: true }),
  body("targetFat").optional({ nullable: true }),
  body("bmi").optional({ nullable: true }),
  body("bmiCategory").optional({ nullable: true }),
  body("location").optional({ nullable: true }),
  body("city").optional({ nullable: true }),
  body("ethnicityCuisine").optional({ nullable: true }),
  body("goal").optional({ nullable: true }),
  body("activityLevel").optional({ nullable: true }),
  body("dietType").optional({ nullable: true }),
  body("diabetes").optional({ nullable: true }),
  body("hypertension").optional({ nullable: true }),
  body("cholesterol").optional({ nullable: true }),
  body("cancerSurvivor").optional({ nullable: true }),
  body("hrt").optional({ nullable: true }),
  body("otherConditions").optional({ nullable: true }),
  body("allergies").optional({ nullable: true }),
  body("foodDislikes").optional({ nullable: true }),
  body("aiNotes")
    .optional({ nullable: true })
    .isArray()
    .withMessage("aiNotes must be an array")
    .bail()
    .custom((notes) => notes.every((note) => typeof note === "string"))
    .withMessage("aiNotes must be an array of strings"),
];

const chatPreferencesRules = [
  body("includeRecentMessages")
    .optional()
    .isBoolean()
    .withMessage("includeRecentMessages must be a boolean"),
  body("includeLongTermMemory")
    .optional()
    .isBoolean()
    .withMessage("includeLongTermMemory must be a boolean"),
  body("includePreferenceMemory")
    .optional()
    .isBoolean()
    .withMessage("includePreferenceMemory must be a boolean"),
  body("includeProfileContext")
    .optional()
    .isBoolean()
    .withMessage("includeProfileContext must be a boolean"),
  body("includeMedicalReports")
    .optional()
    .isBoolean()
    .withMessage("includeMedicalReports must be a boolean"),
];

module.exports = {
  healthProfileRules,
  chatPreferencesRules,
};
