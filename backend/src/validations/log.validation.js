const { body, param } = require("express-validator");

const dailyLogRules = [
  body("date").isISO8601().withMessage("Date must be a valid ISO 8601 date"),
  body("calories")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Calories must be zero or greater"),
  body("protein")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Protein must be zero or greater"),
  body("carbs")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Carbs must be zero or greater"),
  body("fat")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Fat must be zero or greater"),
  body("waterIntake")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Water intake must be zero or greater"),
  body("exerciseCalories")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Exercise calories must be zero or greater"),
];

const logDateRules = [
  param("date").isISO8601().withMessage("Date parameter must be a valid date"),
];

module.exports = {
  dailyLogRules,
  logDateRules,
};
