const express = require("express");
const router = express.Router();

const {
  GetAllPosts,
  InstantPost,
} = require("../../controller/Twitter/Twitter");

router.route("/twitter/get-all-posts").get(GetAllPosts);
router.route("/twitter/instant-post").post(InstantPost);

module.exports = router;