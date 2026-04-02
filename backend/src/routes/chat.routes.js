const express = require("express");

const chatController = require("../controllers/chat.controller");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const { chatMessageRules } = require("../validations/chat.validation");

const router = express.Router();

router.post("/", authenticate, chatMessageRules, validate, chatController.createChatMessage);

module.exports = router;
