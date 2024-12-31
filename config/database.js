const mongoose = require("mongoose");
require('dotenv').config()

const connectdatabase = async () => {
  try {
    console.log(process.env.MONGODB_CONNECT_URI);
    await mongoose.connect(
      process.env.MONGODB_CONNECT_URI
    );
    console.log("db connection successful");
  } catch (error) {
    console.log("db connection failed: " + error.message);
  }
};

module.exports = connectdatabase;