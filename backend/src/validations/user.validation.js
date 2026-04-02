const { body } = require("express-validator");

const healthProfileRules = [
  body("age").isInt({ min: 1 }).withMessage("Age must be a positive number"),
  body("height")
    .isFloat({ min: 1 })
    .withMessage("Height must be a positive number"),
  body("weight")
    .isFloat({ min: 1 })
    .withMessage("Weight must be a positive number"),
  body("goal")
    .isIn(["loss", "gain", "maintain"])
    .withMessage("Goal must be one of loss, gain, or maintain"),
  body("activityLevel")
    .isIn(["sedentary", "light", "moderate", "active", "very_active"])
    .withMessage(
      "Activity level must be one of sedentary, light, moderate, active, or very_active"
    ),
];

module.exports = {
  healthProfileRules,
};
