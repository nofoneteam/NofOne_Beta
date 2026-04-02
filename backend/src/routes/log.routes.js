const express = require("express");

const logController = require("../controllers/log.controller");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const { dailyLogRules, logDateRules } = require("../validations/log.validation");

const router = express.Router();

router.post("/", authenticate, dailyLogRules, validate, logController.createLog);
router.get(
  "/:date",
  authenticate,
  logDateRules,
  validate,
  logController.getLogByDate
);

module.exports = router;
