const mongoose = require("mongoose");

const QueueSchema = new mongoose.Schema({

  userId: { type: String, required: true, unique: true, index: true },
  desk: { type: String, required: true },

  trades: [{ type: String }],   // Array of tradeRef strings

  sessionStart: { type: Date, default: Date.now },
  sessionExpiry: { type: Date },  // sessionStart + 3 hours
  isActive: { type: Boolean, default: true, index: true },

  lastActivity: { type: Date, default: Date.now }

}, { timestamps: true });

module.exports = mongoose.model("Queue", QueueSchema);
