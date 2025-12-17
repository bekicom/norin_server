const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    daily_order_number: { type: Number, index: true }, // tez qidirish uchun index
    order_date: { type: String },
    table_id: { type: String },
    user_id: { type: String },
    items: [
      {
        food_id: String,
        name: String,
        price: Number,
        quantity: Number,
        category_name: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
      index: true, // status bo‘yicha tez filtr
    },
    total_price: { type: Number, default: 0 },
    waiter_percentage: { type: Number, default: 0 },
    service_amount: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    final_total: { type: Number, default: 0 },
    completedAt: { type: Date, index: true },
    completedBy: String,
    paymentAmount: { type: Number, default: 0 },
    changeAmount: { type: Number, default: 0 },
    mixedPaymentDetails: { type: Object, default: {} },
    receiptPrinted: { type: Boolean, default: false },
    closedAt: Date,
    table_number: String,
    waiter_name: { type: String, index: true }, // afitsant bo‘yicha qidirish tezlashadi
  },
  { timestamps: true }
);

// createdAt bo‘yicha sort uchun index
orderSchema.index({ createdAt: -1 });

// status + createdAt kombinatsiya index (aggregate uchun juda foydali)
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = orderSchema;
