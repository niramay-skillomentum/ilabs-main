const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({

  tradeRef: { type: String, index: true },
  action: { type: String, required: true },
  userId: { type: String, index: true },
  desk: { type: String },
  details: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },

  // XML-formatted audit content for automated/system events
  xmlContent: { type: String, default: null },

  // Whether this audit entry was auto-generated (system) vs manual (user action)
  isAutomated: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
