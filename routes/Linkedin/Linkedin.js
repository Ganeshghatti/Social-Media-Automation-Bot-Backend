const express = require("express");
const router = express.Router();

const {
  GetAllPosts,
  InstantPost,
} = require("../../controller/Linkedin/Linkedin");

router.route("/linkedin/get-all-posts").get(GetAllPosts);
router.route("/linkedin/instant-post").post(InstantPost);

module.exports = router;
