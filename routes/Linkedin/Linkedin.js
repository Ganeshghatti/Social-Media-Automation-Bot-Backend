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
} = require("../../controller/Linkedin/Linkedin");

router.route("/linkedin/get-all-posts").get(GetAllPosts);
router.route("/linkedin/create-post").post(upload.fields([
  { name: "img", maxCount: 1 },
]), CreatePost);
router.route("/linkedin/instant-post").post(InstantPost);
router.route("/linkedin/edit-post").put(upload.fields([
  { name: "img", maxCount: 1 },
]), EditPost);
router.route("/linkedin/delete-post").delete(DeletePost);


module.exports = router;
