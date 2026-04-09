const { body } = require("express-validator");

const chatMessageRules = [
  body("message")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 4000 })
    .withMessage("Message must be less than 4000 characters"),
  body("type")
    .isIn(["text", "image", "audio"])
    .withMessage("Type must be text, image, or audio"),
  body().custom((value, { req }) => {
    if (value.type === "image" && !req.file?.path) {
      throw new Error("File upload is required for image messages");
    }

    if ((value.type === "text" || value.type === "audio") && !value.message?.trim()) {
      throw new Error("Message is required for text and audio chat requests");
    }

    return true;
  }),
];

module.exports = {
  chatMessageRules,
};
