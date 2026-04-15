const express = require("express");
const { body } = require("express-validator");
const reminderController = require("../controllers/reminder.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("message").notEmpty().withMessage("Message is required"),
    body("reminderTime").isISO8601().withMessage("Invalid time format"),
  ],
  validate,
  reminderController.createReminder
);

router.post("/trigger", reminderController.triggerReminder);

// Add get array
router.get("/", authMiddleware, reminderController.getReminders);

module.exports = router;
