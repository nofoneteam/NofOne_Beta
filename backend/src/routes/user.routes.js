const express = require("express");

const userController = require("../controllers/user.controller");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  healthProfileRules,
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

module.exports = router;
