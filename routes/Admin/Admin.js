const express = require("express");
const router = express.Router();

const {
  AdminLogin,
} = require("../../controller/Admin/Admin");

router.route("/admin/login").post(AdminLogin);

module.exports = router;