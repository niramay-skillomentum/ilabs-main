const mongoose = require("mongoose");

const UserScoreSchema = new mongoose.Schema({

  userId: { type: String, required: true, unique: true, index: true },
  points: { type: Number, default: 0 },
  penalties: { type: Number, default: 0 },
  tradesResolved: { type: Number, default: 0 },
  history: [{
    tradeRef: String,
    action: String,
    pointsAwarded: Number,
    timestamp: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

module.exports = mongoose.model("UserScore", UserScoreSchema);
