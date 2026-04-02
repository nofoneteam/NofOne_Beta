const { body } = require("express-validator");

const chatMessageRules = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ max: 4000 })
    .withMessage("Message must be less than 4000 characters"),
  body("type")
    .isIn(["text", "image", "audio"])
    .withMessage("Type must be text, image, or audio"),
];

module.exports = {
  chatMessageRules,
};
