const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/Admin");

const {
  AdminLogin,
  GetAllPosts
} = require("../Controller/Admin");

router.route("/admin/login").post(AdminLogin);
router.route("/admin/get-all-posts").get(requireAuth, GetAllPosts);

module.exports = router;