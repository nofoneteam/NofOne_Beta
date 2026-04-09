const { body, param } = require("express-validator");

const bootstrapAdminRules = [
  body("bootstrapSecret")
    .trim()
    .notEmpty()
    .withMessage("bootstrapSecret is required"),
];

const updateUserRoleRules = [
  param("userId").trim().notEmpty().withMessage("userId is required"),
  body("role")
    .isIn(["user", "admin"])
    .withMessage("role must be either user or admin"),
];

const chatConfigRules = [
  body("systemPrompt")
    .optional()
    .isString()
    .isLength({ min: 10, max: 12000 })
    .withMessage("systemPrompt must be between 10 and 12000 characters"),
  body("imageSystemPrompt")
    .optional()
    .isString()
    .isLength({ min: 10, max: 12000 })
    .withMessage("imageSystemPrompt must be between 10 and 12000 characters"),
  body().custom((value) => {
    if (!value.systemPrompt && !value.imageSystemPrompt) {
      throw new Error("At least one prompt field is required");
    }

    return true;
  }),
];

module.exports = {
  bootstrapAdminRules,
  updateUserRoleRules,
  chatConfigRules,
};
