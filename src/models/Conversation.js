const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },   // "USER", "FO", "COUNTERPARTY"
  body: { type: String, required: true },
  subject: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const ConversationSchema = new mongoose.Schema({

  tradeRef: { type: String, required: true, unique: true, index: true },
  status: { type: String, default: "OPEN" },
  desks: [{ type: String }],
  messages: [MessageSchema]

}, { timestamps: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
