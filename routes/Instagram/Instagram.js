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
} = require("../../controller/Instagram/Instagram");

router.route("/instagram/get-all-posts").get(GetAllPosts);
router.route("/instagram/create-post").post(upload.fields([
  { name: "img", maxCount: 1 },
]), CreatePost);
router.route("/instagram/instant-post").post(InstantPost);
router.route("/instagram/edit-post").put(upload.fields([
  { name: "img", maxCount: 1 },
]), EditPost);
router.route("/instagram/delete-post").delete(DeletePost);

module.exports = router;