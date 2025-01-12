const express = require("express");
const router = express.Router();
const { GenerateAIImg, FetchGoogleImage } = require("../../controller/Content/GenerateImg");
const requireAuth = require("../../middleware/User");

router.post("/content/generate-ai-img", requireAuth, GenerateAIImg);
router.post("/content/fetch-google-image", requireAuth, FetchGoogleImage);

module.exports = router;
