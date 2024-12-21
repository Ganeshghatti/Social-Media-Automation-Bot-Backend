const express = require("express");
const connectDatabase = require("./config/database");
const cors = require("cors");
const bodyParser = require("body-parser");
const adminRoutes = require("./routes/Admin");
const dotenv = require("dotenv");
const { cronPublishPosts } = require("./cron/cronPublishPosts");
const { cronShopifyScrapePosts } = require("./cron/cronShopifyScrapePosts");

dotenv.config();

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(adminRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to The Squirrel backend");
});

connectDatabase();

// Start the server
const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not set
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
