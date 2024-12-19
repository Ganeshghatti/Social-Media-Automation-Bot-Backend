const userModel = require("../models/User"); 
const bcrypt = require("bcrypt");

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await userModel.findOne({ email: "info@thesquirrel.site" });
    if (existingAdmin) {
      console.log("Admin already exists.");
      return;
    }

    // Create new user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("admin", salt);
    const admin = await userModel.create({
      email: "info@thesquirrel.site",
      password: hash,
      username: "admin",
      role: "admin",
    });
    console.log("Admin created successfully:", admin);
  } catch (error) {
    console.error("Error creating admin:", error.message);
  }
};

createAdmin();