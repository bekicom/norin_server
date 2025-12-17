const express = require("express");
const router = express.Router();
const {
  getOrderBranch1,
  getOrderBranch2,
  getOrderBranch3,
} = require("../config/db");

router.get("/branch/:branch", async (req, res) => {
  try {
    const { branch } = req.params;
    let Model;

    // ✅ Filial tanlash
    switch (branch) {
      case "1":
        Model = getOrderBranch1();
        break;
      case "2":
        Model = getOrderBranch2();
        break;
      case "3":
        Model = getOrderBranch3();
        break;
      default:
        return res.status(400).json({ message: "❌ Noto‘g‘ri filial ID" });
    }

    const { startDate, endDate } = req.query;
    const query = {};

    // ✅ Sana oralig‘i bo‘yicha filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // ✅ So‘rov
    const orders = await Model.find(query).sort({ createdAt: -1 });

    console.log(`✅ Branch ${branch}: ${orders.length} ta order topildi`);
    res.json(orders);
  } catch (error) {
    console.error("❌ Orderlarni olishda xato:", error.message);
    res.status(500).json({ message: "Server xatosi" });
  }
});

module.exports = router;
