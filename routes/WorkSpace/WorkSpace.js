const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const requireAuth = require("../../middleware/User");

const { CreatePostPresignedUrl, CreatePosts } = require("../../controller/WorkSpace/WorkSpace/Posts");
const {
  CreateWorkSpace,
  GetWorkSpaces,
  DeleteWorkSpace,
  EditWorkSpace,
  GetWorkSpaceById,
} = require("../../controller/WorkSpace/WorkSpace/ManageWorkSpace");
const {
  ConnectTwitter,
  HandleCallback,
  DisconnectTwitter,
} = require("../../controller/WorkSpace/Twitter/ConnectAccounts");

router
  .route("/workspace/create")
  .post(requireAuth, upload.single("icon"), CreateWorkSpace);
router.route("/workspace/get").get(requireAuth, GetWorkSpaces);
router
  .route("/workspace/delete/:workSpaceId")
  .delete(requireAuth, DeleteWorkSpace);
router
  .route("/workspace/edit/:workSpaceId")
  .put(requireAuth, upload.single("icon"), EditWorkSpace);
router.route("/workspace/get/:workSpaceId").get(requireAuth, GetWorkSpaceById);


router.route("/workspace/twitter/connect/:workSpaceId").post(requireAuth, ConnectTwitter);
router.route("/workspace/twitter/callback").get(HandleCallback);
router.route("/workspace/twitter/disconnect/:workspaceId/:accountId").post(requireAuth, DisconnectTwitter);

router.route("/workspace/posts/create/presigned-url/:workspaceId").post(requireAuth, CreatePostPresignedUrl);
router.route("/workspace/posts/create/:workspaceId").post(requireAuth, CreatePosts);

module.exports = router;
