const { body, param, query } = require("express-validator");

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
  body("sleepHours")
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage("Sleep hours must be between 0 and 24"),
  body("exerciseMinutes")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Exercise minutes must be zero or greater"),
  body("exerciseCalories")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Exercise calories must be zero or greater"),
  body("weight")
    .optional({ nullable: true })
    .isFloat({ min: 1 })
    .withMessage("Weight must be a positive number"),
];

const logDateRules = [
  param("date").isISO8601().withMessage("Date parameter must be a valid date"),
];

const sharedReportTokenRules = [
  param("token")
    .trim()
    .isLength({ min: 20 })
    .withMessage("token must be a valid share token"),
];

const dashboardQueryRules = [
  query("date")
    .optional()
    .isISO8601()
    .withMessage("date must be a valid ISO 8601 date"),
];

const weightTrackerQueryRules = [
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
  query("days")
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage("days must be between 1 and 30"),
];

const weeklySummaryQueryRules = [
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
];

const progressReportQueryRules = [
  query("period")
    .optional()
    .isIn(["weekly", "monthly", "custom"])
    .withMessage("period must be weekly, monthly, or custom"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),
  query("dates")
    .optional()
    .isString()
    .withMessage("dates must be a comma separated string of ISO dates"),
];

const shareReportRules = [
  body("period")
    .isIn(["weekly", "monthly", "custom"])
    .withMessage("period must be weekly, monthly, or custom"),
  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),
  body("dates")
    .optional()
    .isArray({ min: 1, max: 31 })
    .withMessage("dates must be an array with 1 to 31 dates"),
  body("dates.*")
    .optional()
    .isISO8601()
    .withMessage("each date must be a valid ISO 8601 date"),
  body().custom((value) => {
    if (value.period === "custom" && !value.startDate && !value.dates?.length) {
      throw new Error("custom reports require startDate or dates");
    }

    return true;
  }),
];

module.exports = {
  dailyLogRules,
  logDateRules,
  sharedReportTokenRules,
  dashboardQueryRules,
  weightTrackerQueryRules,
  weeklySummaryQueryRules,
  progressReportQueryRules,
  shareReportRules,
};
