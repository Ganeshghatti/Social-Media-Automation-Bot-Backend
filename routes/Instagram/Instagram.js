const express = require("express");
const router = express.Router();

const {
  GetAllPosts,
  InstantPost,
} = require("../../controller/Instagram/Instagram");

router.route("/instagram/get-all-posts").get(GetAllPosts);
router.route("/instagram/instant-post").post(InstantPost);

module.exports = router;