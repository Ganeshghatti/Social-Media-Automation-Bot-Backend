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
} = require("../../controller/Twitter/Twitter");

router.route("/twitter/instant-post").post(InstantPost);
router.route("/twitter/create-post").post(upload.fields([
  { name: "img", maxCount: 1 },
]), CreatePost);
router.route("/twitter/get-all-posts").get(GetAllPosts);
router.route("/twitter/edit-post").post(upload.fields([
  { name: "img", maxCount: 1 },
]), EditPost);
router.route("/twitter/delete-post").post(DeletePost);

module.exports = router;