const jwt = require("jsonwebtoken");
const userModel = require("../models/User");
require('dotenv').config()
const requireAuth = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const token = authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    const decodedToken = jwt.verify(token, process.env.JWTSECRET);
    const userId = decodedToken.userId;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(401).json({ error: "Request is not authorized" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired" });
    }

    res.status(401).json({ error: "Request is not authorized" });
  }
};

module.exports = requireAuth;
