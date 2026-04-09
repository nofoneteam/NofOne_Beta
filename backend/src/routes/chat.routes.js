const express = require("express");

const chatController = require("../controllers/chat.controller");
const authenticate = require("../middlewares/auth.middleware");
const handleChatUpload = require("../middlewares/chatUpload.middleware");
const validate = require("../middlewares/validate.middleware");
const { chatMessageRules } = require("../validations/chat.validation");

const router = express.Router();

router.get("/", authenticate, chatController.getChatHistory);

router.post(
  "/",
  authenticate,
  handleChatUpload,
  chatMessageRules,
  validate,
  chatController.createChatMessage
);

module.exports = router;
