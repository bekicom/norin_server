const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDB } = require("./config/db");

dotenv.config();

// MongoDBga ulanamiz
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // JSON body parse qilish uchun

// Test log (kelayotgan so‘rovlarni ko‘rish uchun)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`, req.body || "");
  next();
});

// Root route
app.get("/dashboard1", (req, res) => {
  res.send("Restaurant Dashboard API ishlayapti 🚀");
});

// Auth routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Order routes
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// Serverni ishga tushirish
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server ${PORT} portda ishlayapti`));
