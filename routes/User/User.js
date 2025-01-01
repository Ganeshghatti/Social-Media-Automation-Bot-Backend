const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { EditSettings, GetSettings } = require("../../controller/User/Settings");
const requireAuth = require("../../middleware/User");
const { Signup, Login, ForgotPassword, ResetPassword, VerifyEmail } = require("../../controller/User/Auth");
const { OnBoarding } = require("../../controller/User/OnBoarding");

router
  .route("/user/signup")
  .post(Signup);

router
  .route("/user/login")
  .post(Login);

router
  .route("/user/forgot-password")
  .post(ForgotPassword);

router
  .route("/user/reset-password")
  .post(ResetPassword);

router
  .route("/user/verification/:token")
  .post(VerifyEmail);

router
  .route("/user/settings")
  .put(
    requireAuth,
    upload.fields([{ name: "profilepic", maxCount: 1 }]),
    EditSettings
  );

router.route("/user/settings").get(requireAuth, GetSettings);

router.route("/user/welcome").post(requireAuth, OnBoarding);

module.exports = router;
