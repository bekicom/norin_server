const express = require("express");
const router = express.Router();
const {
  getOrderBranch1,
  getOrderBranch2,
  getOrderBranch3,
} = require("../config/db");

// Helper: Model olish
function getBranchModel(branch) {
  const models = {
    1: getOrderBranch1,
    2: getOrderBranch2,
    3: getOrderBranch3,
  };

  const getModel = models[branch];
  if (!getModel) {
    throw new Error("INVALID_BRANCH");
  }

  return getModel();
}

router.get("/branch/:branch", async (req, res) => {
  try {
    const { branch } = req.params;
    const {
      startDate,
      endDate,
      limit = 100, // ⚡ Default 100 ta
      page = 1,
      status,
      paymentMethod,
    } = req.query;

    // Model olish
    let Model;
    try {
      Model = getBranchModel(branch);
    } catch (err) {
      return res.status(400).json({
        message: "❌ Noto'g'ri filial ID",
        error: "INVALID_BRANCH",
      });
    }

    // Filter yaratish
    const query = {};

    // Sana filtri
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Sana validatsiyasi
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          message: "❌ Sana formati noto'g'ri",
          error: "INVALID_DATE_FORMAT",
        });
      }

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    // Status filtri (agar kerak bo'lsa)
    if (status) {
      query.status = status;
    }

    // Payment method filtri (agar kerak bo'lsa)
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit))); // Max 1000
    const skip = (pageNum - 1) * limitNum;

    console.log(`🔍 Branch ${branch} request:`, {
      query,
      page: pageNum,
      limit: limitNum,
    });

    // ⚡ PARALLEL QUERY - tezroq
    const startTime = Date.now();

    const [orders, total] = await Promise.all([
      Model.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean() // ⚡ 30-50% tezroq
        .select("-__v"), // __v fieldni olib tashlash
      Model.countDocuments(query),
    ]);

    const queryTime = Date.now() - startTime;

    console.log(
      `✅ Branch ${branch}: ${orders.length} ta order topildi (${queryTime}ms)`
    );

    res.json({
      success: true,
      branch,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      queryTime: `${queryTime}ms`,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Orderlarni olishda xato:", {
      message: error.message,
      stack: error.stack,
      branch: req.params.branch,
    });

    // MongoDB xatolari
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "❌ So'rov formati noto'g'ri",
        error: "INVALID_QUERY_FORMAT",
      });
    }

    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongooseServerSelectionError"
    ) {
      return res.status(503).json({
        message: "❌ Database bilan bog'lanishda xatolik",
        error: "DB_CONNECTION_ERROR",
      });
    }

    res.status(500).json({
      message: "❌ Server xatosi",
      error: "INTERNAL_SERVER_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
