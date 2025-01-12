const path = require('path');

require('dotenv').config({ 
  path: path.resolve(__dirname, process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env.development')
});

const express = require("express");
const connectDatabase = require("./config/database");
const cors = require("cors");
const bodyParser = require("body-parser");
const adminRoutes = require("./routes/Admin/Admin");
const dashboardRoutes = require("./routes/Dashboard/Dashboard");
const workspaceRoutes = require("./routes/WorkSpace/WorkSpace");
const userRoutes = require("./routes/User/User");
const contentRoutes= require("./routes/Content/Content")
const moment = require("moment");

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(adminRoutes);
app.use(dashboardRoutes);
app.use(userRoutes);
app.use(workspaceRoutes);
app.use(contentRoutes)

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to The Squirrel backend");
});

connectDatabase();
console.log(moment());

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
