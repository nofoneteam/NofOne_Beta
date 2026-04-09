const { body } = require("express-validator");

const healthProfileRules = [
  body("age")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Age must be a positive number"),
  body("gender")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 30 })
    .withMessage("Gender must be a string up to 30 characters"),
  body("height")
    .optional({ nullable: true })
    .isFloat({ min: 1 })
    .withMessage("Height must be a positive number"),
  body("weight")
    .optional({ nullable: true })
    .isFloat({ min: 1 })
    .withMessage("Weight must be a positive number"),
  body("targetWeight")
    .optional({ nullable: true })
    .isFloat({ min: 1 })
    .withMessage("Target weight must be a positive number"),
  body("bmi")
    .optional({ nullable: true })
    .isFloat({ min: 1 })
    .withMessage("BMI must be a positive number"),
  body("bmiCategory")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 40 })
    .withMessage("BMI category must be a string up to 40 characters"),
  body("location")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 160 })
    .withMessage("Location must be a string up to 160 characters"),
  body("city")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 80 })
    .withMessage("City must be a string up to 80 characters"),
  body("ethnicityCuisine")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 120 })
    .withMessage("Ethnicity / cuisine must be a string up to 120 characters"),
  body("goal")
    .optional({ nullable: true })
    .isIn(["loss", "gain", "maintain", "lose_weight", "gain_weight"])
    .withMessage(
      "Goal must be one of loss, gain, maintain, lose_weight, or gain_weight"
    ),
  body("activityLevel")
    .optional({ nullable: true })
    .isIn(["sedentary", "light", "moderate", "active", "very_active"])
    .withMessage(
      "Activity level must be one of sedentary, light, moderate, active, or very_active"
    ),
  body("dietType")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 60 })
    .withMessage("Diet type must be a string up to 60 characters"),
  body("diabetes")
    .optional({ nullable: true })
    .isIn(["yes", "no"])
    .withMessage("Diabetes must be yes or no"),
  body("hypertension")
    .optional({ nullable: true })
    .isIn(["yes", "no"])
    .withMessage("Hypertension must be yes or no"),
  body("cholesterol")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 40 })
    .withMessage("Cholesterol must be a string up to 40 characters"),
  body("cancerSurvivor")
    .optional({ nullable: true })
    .isIn(["yes", "no"])
    .withMessage("Cancer survivor must be yes or no"),
  body("hrt")
    .optional({ nullable: true })
    .isIn(["yes", "no"])
    .withMessage("HRT must be yes or no"),
  body("otherConditions")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage("Other conditions must be up to 500 characters"),
  body("allergies")
    .optional({ nullable: true })
    .isArray({ max: 20 })
    .withMessage("Allergies must be an array with up to 20 items"),
  body("allergies.*")
    .optional()
    .isString()
    .isLength({ max: 80 })
    .withMessage("Each allergy must be a string up to 80 characters"),
  body("foodDislikes")
    .optional({ nullable: true })
    .isArray({ max: 20 })
    .withMessage("Food dislikes must be an array with up to 20 items"),
  body("foodDislikes.*")
    .optional()
    .isString()
    .isLength({ max: 80 })
    .withMessage("Each food dislike must be a string up to 80 characters"),
  body("aiNotes")
    .optional({ nullable: true })
    .isArray({ max: 20 })
    .withMessage("AI notes must be an array with up to 20 items"),
  body("aiNotes.*")
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage("Each AI note must be a string up to 300 characters"),
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
