const express = require("express");

const logController = require("../controllers/log.controller");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  dailyLogRules,
  logDateRules,
  dashboardQueryRules,
  weightTrackerQueryRules,
  weeklySummaryQueryRules,
  progressReportQueryRules,
  shareReportRules,
  sharedReportTokenRules,
} = require("../validations/log.validation");

const router = express.Router();

router.post("/", authenticate, dailyLogRules, validate, logController.createLog);
router.get(
  "/dashboard",
  authenticate,
  dashboardQueryRules,
  validate,
  logController.getDashboard
);
router.get(
  "/weight-tracker",
  authenticate,
  weightTrackerQueryRules,
  validate,
  logController.getWeightTrackerSummary
);
router.get(
  "/progress-report",
  authenticate,
  progressReportQueryRules,
  validate,
  logController.getProgressReportController
);
router.get(
  "/weekly-summary",
  authenticate,
  weeklySummaryQueryRules,
  validate,
  logController.getWeeklySummaryController
);
router.get(
  "/weekly-report",
  authenticate,
  weeklySummaryQueryRules,
  validate,
  logController.getWeeklyReportController
);
router.post(
  "/share-report",
  authenticate,
  shareReportRules,
  validate,
  logController.createSharedReportController
);
router.get(
  "/shared/:token",
  sharedReportTokenRules,
  validate,
  logController.getSharedReportController
);
router.get(
  "/:date",
  authenticate,
  logDateRules,
  validate,
  logController.getLogByDate
);

module.exports = router;
