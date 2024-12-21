const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/Admin");

const {
  AdminLogin,
  GetAllPosts,
  InstantPost,
} = require("../controller/Admin");

router.route("/admin/login").post(AdminLogin);
router.route("/admin/get-all-posts").get(requireAuth, GetAllPosts);
router.route("/admin/instant-post").post(requireAuth, InstantPost);

module.exports = router;