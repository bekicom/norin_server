const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // Headerda tokenni tekshirish
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Tokenni decode qilish
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Token ichidagi userni DB’dan topamiz
      req.user = await User.findById(decoded.id).select("-password");

      next(); // ✅ keyingi bosqichga o‘tkazamiz
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Token noto‘g‘ri yoki muddati tugagan ❌" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Token topilmadi ❌" });
  }
};

module.exports = protect;
