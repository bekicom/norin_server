const express = require("express");
const {
  getAllSummary,
  getBranchOrders,
  getBranchOrdersGrouped,
} = require("../controllers/dashboardController");
const router = express.Router();

// Umumiy summary (ikki filial)
router.get("/summary", getAllSummary);

// Filial orderlari (masalan: /api/dashboard/orders/1 yoki /api/dashboard/orders/2)
router.get("/orders/:branch", getBranchOrders);
router.get("/orders/:branch/grouped", getBranchOrdersGrouped); // ✅ Yangi route

module.exports = router;
