const express = require("express");

const adminController = require("../controllers/admin.controller");
const authenticate = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/requireRole.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  bootstrapAdminRules,
  updateUserRoleRules,
  chatConfigRules,
} = require("../validations/admin.validation");

const router = express.Router();

router.post(
  "/bootstrap",
  authenticate,
  bootstrapAdminRules,
  validate,
  adminController.bootstrapAdminController
);
router.patch(
  "/users/:userId/role",
  authenticate,
  requireRole("admin"),
  updateUserRoleRules,
  validate,
  adminController.updateUserRoleController
);
router.get(
  "/chat-config",
  authenticate,
  requireRole("admin"),
  adminController.getChatConfigController
);
router.put(
  "/chat-config",
  authenticate,
  requireRole("admin"),
  chatConfigRules,
  validate,
  adminController.upsertChatConfigController
);

module.exports = router;
