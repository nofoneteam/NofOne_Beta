const express = require("express");

const userController = require("../controllers/user.controller");
const authenticate = require("../middlewares/auth.middleware");
const handleReportUpload = require("../middlewares/reportUpload.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  healthProfileRules,
  chatPreferencesRules,
} = require("../validations/user.validation");

const router = express.Router();

router.post(
  "/profile",
  authenticate,
  healthProfileRules,
  validate,
  userController.createOrUpdateProfile
);
router.get("/profile", authenticate, userController.getProfile);
router.post("/profile-ai-suggestion", authenticate, userController.generateAiProfileSuggestion);
router.get("/chat-preferences", authenticate, userController.getChatPreferences);
router.post(
  "/chat-preferences",
  authenticate,
  chatPreferencesRules,
  validate,
  userController.updateChatPreferences
);
router.get("/reports", authenticate, userController.getReports);
router.post("/reports", authenticate, handleReportUpload, userController.uploadReport);

module.exports = router;
