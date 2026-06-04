const express = require("express");

const scenarioEngine = require("../engine/scenarioEngine");
const lifecycle = require("../engine/lifecycle");
const queue = require("../engine/queue");
const conversationEngine = require("../engine/conversationEngine");
const communicationEngine = require("../engine/communicationEngine");
const auditEngine = require("../engine/auditEngine");

const router = express.Router();



/*
START ASSIGNMENT
Generates scenario with 20 trades
*/
router.post("/assignment/start", async (req, res) => {
  try {

    const assignment = await scenarioEngine.generateAssignment();

    res.json({
      status: "ok",
      assignmentId: assignment.assignmentId,
      tradeCount: assignment.trades.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Assignment generation failed" });
  }
});



/*
DESK QUEUE
Fetch trades for desk
*/
router.get("/queue/:desk", async (req, res) => {
  try {

    const desk = req.params.desk;

    const trades = queue.getDeskQueue(desk);

    res.json(trades);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Queue retrieval failed" });
  }
});



/*
TRADE INVESTIGATION
Return operational trade data
Scenario truth NOT exposed
*/
router.get("/trade/:tradeId", async (req, res) => {
  try {

    const tradeId = req.params.tradeId;

    const trade = lifecycle.getTrade(tradeId);

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    res.json(trade);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Trade retrieval failed" });
  }
});



/*
CONVERSATION HISTORY
*/
router.get("/conversation/:tradeId", async (req, res) => {
  try {

    const tradeId = req.params.tradeId;

    const thread = conversationEngine.getConversation(tradeId);

    res.json(thread);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Conversation retrieval failed" });
  }
});



/*
SEND MESSAGE TO COUNTERPARTY
Triggers AI pipeline
*/
router.post("/conversation/send", async (req, res) => {
  try {

    const { tradeId, message } = req.body;

    if (!tradeId || !message) {
      return res.status(400).json({ error: "tradeId and message required" });
    }

    await communicationEngine.processUserMessage(tradeId, message);

    res.json({
      status: "sent"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Message send failed" });
  }
});



/*
AUDIT TIMELINE
*/
router.get("/audit/:tradeId", async (req, res) => {
  try {

    const tradeId = req.params.tradeId;

    const audit = auditEngine.getAuditTrail(tradeId);

    res.json(audit);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Audit retrieval failed" });
  }
});



module.exports = router;