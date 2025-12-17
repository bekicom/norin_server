const mongoose = require("mongoose");
const { connectDB } = require("../config/db");

// Branch1 connectionni olamiz
const { branch1Conn } = connectDB();

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

module.exports = branch1Conn.model("User", userSchema, "users");
