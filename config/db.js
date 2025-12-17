const mongoose = require("mongoose");
const orderSchema = require("../models/Order");

// Global o'zgaruvchilar
let OrderBranch1;
let branch1Conn;

// Filial DB ulanishi
function connectDB() {
  try {
    // Branch1 (asosiy: users ham shu yerda)
    branch1Conn = mongoose.createConnection(process.env.MONGO_URI_BRANCH1, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Order modelini aniqlash
    OrderBranch1 = branch1Conn.model("Order", orderSchema, "globalorders");

    // Ulanish holatini log qilish
    branch1Conn.on("connected", () =>
      console.log("✅ Branch1 DB ulandi (users + orders)")
    );

    branch1Conn.on("error", (err) =>
      console.error("❌ Branch1 ulanish xatosi:", err.message)
    );

    return { branch1Conn };
  } catch (error) {
    console.error("❌ DB ulanish xatosi:", error.message);
    process.exit(1);
  }
}

// Ulanishlarni qaytaruvchi funksiyalar
function getBranch1Conn() {
  if (!branch1Conn) {
    throw new Error(
      "Branch1 connection not initialized. Call connectDB first."
    );
  }
  return branch1Conn;
}

// Order modelini qaytaruvchi funksiyalar
function getOrderBranch1() {
  if (!OrderBranch1) {
    throw new Error(
      "OrderBranch1 model not initialized. Call connectDB first."
    );
  }
  return OrderBranch1;
}

module.exports = {
  connectDB,
  getBranch1Conn,
  getOrderBranch1,
};
