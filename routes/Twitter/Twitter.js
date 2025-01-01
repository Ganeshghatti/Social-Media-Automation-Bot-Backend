const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const {
  GetAllPosts,
  InstantPost,
  EditPost,
  DeletePost,
  CreatePost,
  GetPostsByDate,
} = require("../../controller/Twitter/Twitter");
// const { GetAuthUrl, HandleCallback, DisconnectTwitter } = require("../../controller/Twitter/TwitterAuth");
const requireAuth = require("../../middleware/User");

router.route("/twitter/instant-post").post(requireAuth, InstantPost);
router.route("/twitter/create-post").post(requireAuth, upload.fields([
  { name: "img", maxCount: 1 },
]), CreatePost);
router.route("/twitter/get-all-posts").get(requireAuth, GetAllPosts);
router.route("/twitter/edit-post").put(requireAuth, upload.fields([
  { name: "img", maxCount: 1 },
]), EditPost);
router.route("/twitter/delete-post").delete(requireAuth, DeletePost);
router.route("/twitter/get-posts-by-date/:date").get(requireAuth, GetPostsByDate);

// router.route("/twitter/auth").get(requireAuth, GetAuthUrl);
// router.route("/twitter/callback").get(HandleCallback);
// router.route("/twitter/disconnect").post(requireAuth, DisconnectTwitter);

module.exports = router;