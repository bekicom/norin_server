const orderSchema = require("../models/Order");
const {
  getBranch1Conn,
  getBranch2Conn,
  getBranch3Conn,
} = require("../config/db");

// Model cache - bir marta yaratib, qayta ishlatamiz
let Branch1Order, Branch2Order, Branch3Order;

function initializeModels() {
  if (!Branch1Order) {
    Branch1Order = getBranch1Conn().model("Order", orderSchema, "globalorders");
  }
  if (!Branch2Order) {
    Branch2Order = getBranch2Conn().model("Order", orderSchema, "globalorders");
  }
  if (!Branch3Order) {
    Branch3Order = getBranch3Conn().model("Order", orderSchema, "globalorders");
  }
}

// Helper: Filialga mos model olish
function getBranchModel(branch) {
  initializeModels();

  const models = {
    1: Branch1Order,
    2: Branch2Order,
    3: Branch3Order,
  };

  if (!models[branch]) {
    throw new Error(`INVALID_BRANCH: ${branch}`);
  }

  return models[branch];
}

// Helper: Date filter yaratish
function buildDateFilter(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Sana validatsiyasi
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("INVALID_DATE_FORMAT");
  }

  if (start > end) {
    throw new Error("START_DATE_AFTER_END_DATE");
  }

  return {
    $or: [
      { createdAt: { $gte: start, $lte: end } },
      { order_date: { $gte: start, $lte: end } },
    ],
  };
}

// Helper: Array filter yaratish
function buildArrayFilter(fieldName, commaSeparatedValues) {
  if (!commaSeparatedValues) return null;

  const arr = commaSeparatedValues
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!arr.length) return null;

  return { [fieldName]: { $in: arr } };
}

// ================================
// ✅ Filial bo'yicha orderlar
// ================================
exports.getBranchOrders = async (req, res) => {
  try {
    const { branch } = req.params;
    const {
      startDate,
      endDate,
      status,
      paymentMethod,
      limit = 200,
      page = 1,
    } = req.query;

    // Input validatsiya
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        error: "INVALID_PAGINATION",
        message: "❌ Page >= 1 va limit 1-1000 oralig'ida bo'lishi kerak",
      });
    }

    // Model olish
    let Model;
    try {
      Model = getBranchModel(branch);
    } catch (err) {
      console.log(`⚠️ Noto'g'ri filial so'raldi: ${branch}`);
      return res.status(400).json({
        error: "INVALID_BRANCH",
        message: `❌ Filial ${branch} mavjud emas. Faqat 1, 2, 3 ruxsat etilgan`,
      });
    }

    // Filter yaratish
    const filter = {};

    try {
      const dateFilter = buildDateFilter(startDate, endDate);
      if (dateFilter) Object.assign(filter, dateFilter);
    } catch (err) {
      return res.status(400).json({
        error: err.message,
        message: "❌ Sana formati noto'g'ri. Format: YYYY-MM-DD",
      });
    }

    const statusFilter = buildArrayFilter("status", status);
    if (statusFilter) Object.assign(filter, statusFilter);

    const paymentFilter = buildArrayFilter("paymentMethod", paymentMethod);
    if (paymentFilter) Object.assign(filter, paymentFilter);

    const skip = (pageNum - 1) * limitNum;

    console.log(`🔍 Branch ${branch} orderlar so'raldi:`, {
      filter,
      page: pageNum,
      limit: limitNum,
    });

    // Parallel query
    const [orders, total] = await Promise.all([
      Model.find(filter)
        .sort({ createdAt: -1, order_date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(), // Performance uchun lean() qo'shamiz
      Model.countDocuments(filter),
    ]);

    console.log(
      `✅ Branch ${branch}: ${orders.length} ta order topildi (Jami: ${total})`
    );

    res.json({
      success: true,
      branch,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum),
      items: orders,
    });
  } catch (err) {
    console.error("❌ getBranchOrders xato:", {
      branch: req.params.branch,
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    // MongoDB xatolari
    if (err.name === "CastError") {
      return res.status(400).json({
        error: "INVALID_QUERY_FORMAT",
        message: "❌ So'rov formati noto'g'ri",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }

    if (
      err.name === "MongoNetworkError" ||
      err.name === "MongooseServerSelectionError"
    ) {
      return res.status(503).json({
        error: "DB_CONNECTION_ERROR",
        message: "❌ Database bilan bog'lanishda xatolik",
      });
    }

    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "❌ Serverda kutilmagan xatolik yuz berdi",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ================================
// ✅ Guruhlangan mahsulotlar
// ================================
exports.getBranchOrdersGrouped = async (req, res) => {
  try {
    const { branch } = req.params;
    const { startDate, endDate, status, paymentMethod } = req.query;

    // Model olish
    let Model;
    try {
      Model = getBranchModel(branch);
    } catch (err) {
      console.log(`⚠️ Noto'g'ri filial so'raldi: ${branch}`);
      return res.status(400).json({
        error: "INVALID_BRANCH",
        message: `❌ Filial ${branch} mavjud emas. Faqat 1, 2, 3 ruxsat etilgan`,
      });
    }

    // Filter yaratish
    const matchFilter = {};

    try {
      const dateFilter = buildDateFilter(startDate, endDate);
      if (dateFilter) Object.assign(matchFilter, dateFilter);
    } catch (err) {
      return res.status(400).json({
        error: err.message,
        message: "❌ Sana formati noto'g'ri. Format: YYYY-MM-DD",
      });
    }

    const statusFilter = buildArrayFilter("status", status);
    if (statusFilter) Object.assign(matchFilter, statusFilter);

    const paymentFilter = buildArrayFilter("paymentMethod", paymentMethod);
    if (paymentFilter) Object.assign(matchFilter, paymentFilter);

    console.log(
      `📊 Branch ${branch} guruhlangan mahsulotlar so'raldi:`,
      matchFilter
    );

    const groupedItems = await Model.aggregate([
      { $match: matchFilter },
      {
        $project: {
          items: { $ifNull: ["$items", "$ordered_items"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $ifNull: ["$items.name", "$items.item_name"] },
          itemName: {
            $first: { $ifNull: ["$items.name", "$items.item_name"] },
          },
          category: {
            $first: {
              $ifNull: ["$items.category_name", "$items.category", "Boshqa"],
            },
          },
          quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
          subtotal: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.quantity", 1] },
                { $ifNull: ["$items.price", "$items.unit_price", 0] },
              ],
            },
          },
        },
      },
      { $sort: { quantity: -1 } },
    ]);

    console.log(
      `✅ Branch ${branch}: ${groupedItems.length} ta guruhlangan mahsulot topildi`
    );

    res.json({
      success: true,
      branch,
      totalItems: groupedItems.length,
      items: groupedItems,
    });
  } catch (err) {
    console.error("❌ getBranchOrdersGrouped xato:", {
      branch: req.params.branch,
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    // Aggregation xatolari
    if (err.name === "MongoServerError" && err.code === 16436) {
      return res.status(400).json({
        error: "AGGREGATION_ERROR",
        message: "❌ Aggregation pipeline xatosi",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }

    if (
      err.name === "MongoNetworkError" ||
      err.name === "MongooseServerSelectionError"
    ) {
      return res.status(503).json({
        error: "DB_CONNECTION_ERROR",
        message: "❌ Database bilan bog'lanishda xatolik",
      });
    }

    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "❌ Serverda kutilmagan xatolik yuz berdi",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
