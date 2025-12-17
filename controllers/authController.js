const { getBranch1Conn } = require("../config/db");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Model olish helper
function getUserModel() {
  const branch1Conn = getBranch1Conn();
  return branch1Conn.model("User", userSchema, "users");
}

// 🔹 Foydalanuvchi yaratish (faqat Branch1)
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validatsiya
    if (!username || !password) {
      return res.status(400).json({
        message: "❌ Username va password majburiy",
        error: "MISSING_FIELDS",
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        message: "❌ Username kamida 3 ta belgidan iborat bo'lishi kerak",
        error: "USERNAME_TOO_SHORT",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "❌ Parol kamida 6 ta belgidan iborat bo'lishi kerak",
        error: "PASSWORD_TOO_SHORT",
      });
    }

    const Branch1User = getUserModel();

    // Avval Branch1 da borligini tekshiramiz
    const existing = await Branch1User.findOne({ username });
    if (existing) {
      console.log(`⚠️ Takroriy username: ${username}`);
      return res.status(400).json({
        message: "❌ Bu login allaqachon mavjud",
        error: "USERNAME_EXISTS",
      });
    }

    // Branch1 ga yozamiz
    const user1 = await Branch1User.create({ username, password });

    console.log(`✅ Yangi user yaratildi: ${username} (ID: ${user1._id})`);

    res.status(201).json({
      message: "✅ Foydalanuvchi muvaffaqiyatli yaratildi",
      user: {
        id: user1._id,
        username: user1.username,
      },
    });
  } catch (err) {
    console.error("❌ Register xato:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name,
    });

    // Mongoose validation xatosi
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "❌ Ma'lumotlar noto'g'ri formatda",
        error: "VALIDATION_ERROR",
        details: err.message,
      });
    }

    // Duplicate key xatosi
    if (err.code === 11000) {
      return res.status(400).json({
        message: "❌ Bu username allaqachon mavjud",
        error: "DUPLICATE_KEY",
      });
    }

    // Database connection xatosi
    if (
      err.name === "MongoNetworkError" ||
      err.name === "MongooseServerSelectionError"
    ) {
      return res.status(503).json({
        message: "❌ Database bilan bog'lanishda xatolik",
        error: "DB_CONNECTION_ERROR",
      });
    }

    // Umumiy xatolik
    res.status(500).json({
      message: "❌ Serverda kutilmagan xatolik yuz berdi",
      error: "INTERNAL_SERVER_ERROR",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// 🔹 Login (faqat Branch1 dan tekshiramiz)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validatsiya
    if (!username || !password) {
      return res.status(400).json({
        message: "❌ Username va password majburiy",
        error: "MISSING_FIELDS",
      });
    }

    const Branch1User = getUserModel();

    const user = await Branch1User.findOne({ username });

    if (!user) {
      console.log(`⚠️ Login urinish: username topilmadi - ${username}`);
      return res.status(404).json({
        message: "❌ Foydalanuvchi topilmadi",
        error: "USER_NOT_FOUND",
      });
    }

    if (user.password !== password) {
      console.log(`⚠️ Login urinish: noto'g'ri parol - ${username}`);
      return res.status(401).json({
        message: "❌ Parol noto'g'ri",
        error: "INVALID_PASSWORD",
      });
    }

    // 🔑 Token generatsiya qilamiz
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("❌ KRITIK: JWT_SECRET env variable o'rnatilmagan!");
      return res.status(500).json({
        message: "❌ Server konfiguratsiya xatosi",
        error: "JWT_SECRET_MISSING",
      });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwtSecret,
      { expiresIn: "7d" }
    );

    console.log(`✅ Muvaffaqiyatli login: ${username} (ID: ${user._id})`);

    res.json({
      message: "✅ Login muvaffaqiyatli",
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("❌ Login xato:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name,
    });

    // JWT xatosi
    if (err.name === "JsonWebTokenError") {
      return res.status(500).json({
        message: "❌ Token yaratishda xatolik",
        error: "JWT_ERROR",
      });
    }

    // Database connection xatosi
    if (
      err.name === "MongoNetworkError" ||
      err.name === "MongooseServerSelectionError"
    ) {
      return res.status(503).json({
        message: "❌ Database bilan bog'lanishda xatolik",
        error: "DB_CONNECTION_ERROR",
      });
    }

    // Umumiy xatolik
    res.status(500).json({
      message: "❌ Serverda kutilmagan xatolik yuz berdi",
      error: "INTERNAL_SERVER_ERROR",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
