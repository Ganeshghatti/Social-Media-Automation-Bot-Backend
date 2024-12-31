const mongoose = require("mongoose");
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })

const connectdatabase = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_CONNECT_URI
    );
    console.log("db connection successful");
  } catch (error) {
    console.log("db connection failed: " + error.message);
  }
};

module.exports = connectdatabase;