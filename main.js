const express = require("express");
const connectdatabase = require("./config/database");
const cors = require("cors");
const bodyParser = require("body-parser");
const adminroutes = require("./routes/Admin");
const dotenv = require("dotenv");
const path = require("path");
const transporter = require("./config/email");
const { cronPublishPosts } = require("./api/cronPublishPosts");
const { cronCreatePosts } = require("./api/cronCreatePosts");

dotenv.config({ path: path.join(__dirname, "api", ".env") });
const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(adminroutes);

app.get("/", (req, res) => {
  res.send("Welcome to The Squirrel backend");
});

connectdatabase();

cronPublishPosts();

module.exports = app;