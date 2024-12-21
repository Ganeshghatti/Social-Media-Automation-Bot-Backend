const mongoose = require("mongoose");
const dotenv = require("dotenv");

const envFile = process.env.TWITTER_ENV;
dotenv.config({ path: envFile });

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