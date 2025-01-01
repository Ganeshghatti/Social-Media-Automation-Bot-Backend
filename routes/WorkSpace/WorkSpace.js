const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const {
  CreateWorkSpace,
  GetWorkSpaces,
  DeleteWorkSpace,
  EditWorkSpace,
  GetWorkSpaceById,
} = require("../../controller/WorkSpace/WorkSpace/WorkSpace");
const {
  ConnectTwitter,
  HandleCallback,
  DisconnectTwitter,
} = require("../../controller/WorkSpace/Twitter/ConnectAccounts");
const requireAuth = require("../../middleware/User");

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

module.exports = router;
