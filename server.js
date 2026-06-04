const express = require("express");
require("dotenv").config();

const simulationClock = require("./src/engine/clock");

const conversationEngine = require("./src/engine/conversationEngine");
const aiParser = require("./src/engine/aiParser");
const cptyAI = require("./src/engine/cptyAI");
const truthEngine = require("./src/engine/truthEngine");
const amendmentEngine = require("./src/engine/amendmentEngine");
const communicationEngine = require("./src/engine/communicationEngine");
const auditEngine = require("./src/engine/auditEngine");

const boxPool = require("./src/engine/boxPool");
const queueComposer = require("./src/engine/queueComposer");

const LifecycleEngine = require("./src/engine/lifecycle");

// ✅ S2.9.1
const scoringEngine = require("./src/engine/scoringEngine");

const app = express();
const PORT = process.env.PORT || 3000;

const lifecycleBot = require("./src/engine/lifecycleBot");
const dailyScheduler = require("./src/engine/dailyScheduler");

const activeQueues = {};

// ✅ BOT CONTROL (runs only when no active users)
const { getConfig, updateConfig } = require("./src/engine/botConfig");;

setInterval(() => {

  const config = getConfig();

  if (!config.enabled) {
    console.log("LifecycleBot disabled by admin");
    return;
  }

  if (Object.keys(activeQueues).length > 0) {
    console.log("LifecycleBot skipped (active users present)");
    return;
  }

  lifecycleBot.runBot();

}, getConfig().runIntervalMs);

setInterval(() => {
  dailyScheduler.runDailyCycle();
}, 60000);

setInterval(() => {
  const now = new Date();

  Object.keys(activeQueues).forEach(userId => {
    const session = activeQueues[userId];

    const inactiveMs = now - new Date(session.lastActiveAt || session.createdAt);

    if (inactiveMs > 15 * 60 * 1000) {

      session.trades.forEach(trade => {
        boxPool.returnTrade(trade);
      });

      delete activeQueues[userId];
    }
  });

}, 60000);

app.use(express.json());
app.use(express.static("public"));

app.post("/api/queue/generate",(req,res)=>{

  try{

    const {desk, userId}=req.body;

    if(!userId){
      return res.status(400).json({error:"userId required"});
    }

    if(activeQueues[userId] && activeQueues[userId].locked){
    return res.json({
        success:false,
        error:"Complete your current queue first"
    });
}

// 🔧 CLOCK FIX START

    const queue=queueComposer.buildQueue(desk);
	console.log("QUEUE SAMPLE:", queue[0]);

    	// 🔧 CLOCK FIX START
       simulationClock.start();
// 🔧 CLOCK FIX END

    activeQueues[userId] = {
      desk,
      trades: queue,
      locked: true,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

// 🔧 CLOCK FIX END

    res.json({
      success:true,
      desk,
      queueSize:queue.length,
      trades:queue
    });

  }catch(err){
    res.status(500).json({error:err.message});
  }
});

app.post("/api/conversation/resolve", (req, res) => {

  const { tradeRef, userId } = req.body;

  const session = activeQueues[userId];

  if (!session) {
    return res.status(400).json({ error: "Invalid session" });
  }

  const trade = session.trades.find(t => t.tradeRef === tradeRef);

  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  // ✅ Mark conversation resolved
  if (!trade.conversation) {
    trade.conversation = {};
  }

  trade.conversation.status = "RESOLVED";
  trade.conversation.resolvedAt = Date.now();

  // ✅ Accept all pending amendments
  if (trade.pendingAmendments) {
    trade.pendingAmendments.forEach(a => {
      a.status = "ACCEPTED";
    });
  }

  return res.json({
    success: true,
    message: "Conversation resolved"
  });
});

app.get("/api/queue/my",(req,res)=>{
  try{
    const { userId } = req.query;

    if(!userId){
      return res.status(400).json({error:"userId required"});
    }

    const session = activeQueues[userId];

    if(!session){
      return res.status(400).json({error:"No active queue"});
    }

    session.lastActiveAt = new Date();

    res.json({
      success:true,
      desk: session.desk,
      queueSize: session.trades.length,
      trades: session.trades
    });

  }catch(err){
    res.status(500).json({error:err.message});
  }
});

app.post("/api/session/logout",(req,res)=>{
  try{
    const { userId } = req.body;

    if(!userId){
      return res.status(400).json({error:"userId required"});
    }

    const session = activeQueues[userId];

    if(!session){
      return res.status(400).json({error:"No active session"});
    }

    session.trades.forEach(trade=>{
      boxPool.returnTrade(trade);
    });

    delete activeQueues[userId];

    res.json({ success:true });

  }catch(err){
    res.status(500).json({error:err.message});
  }
});

// 🔧 CLOCK FIX START (CLOCK API)

app.get("/api/clock", (req, res) => {

  const now = simulationClock.getTime();

  const hours = now.getHours();
  const minutes = now.getMinutes();

  const totalMinutesLeft = (18 * 60) - (hours * 60 + minutes);

  res.json({
    simTime: simulationClock.getFormattedTime(),
    timeLeftMinutes: totalMinutesLeft
  });

});

// 🔧 COMMUNICATION UI
app.post("/api/conversation/send", (req, res) => {

  const { tradeRef, sender, message } = req.body;

  const subject = `Trade ${tradeRef} - Break Investigation`;

  // ✅ Save message
  conversationEngine.createMessage(
    tradeRef,
    sender,
    message,
    subject
  );

  // 🔥 STEP 1 — PARSE USER MESSAGE
  const parsed = aiParser.parseEmail(message);

  // 🔥 STEP 2 — FIND TRADE IN ACTIVE SESSION
  let trade = null;

  for (const userId in activeQueues) {
    const session = activeQueues[userId];

    const found = session.trades.find(t => t.tradeRef === tradeRef);
    if (found) {
      trade = found;
      break;
    }
  }
    console.log("TRADE:", trade);
  const test = amendmentEngine.createAmendmentFromInput(
  trade,
  "amount",
  trade.truth.amount
);

console.log("TEST AMENDMENT:", test);
  // 🔥 STEP 3 — VALIDATE & CREATE AMENDMENT (ONLY AMOUNT FOR NOW)
  if (trade && parsed && parsed.amounts && parsed.amounts.length > 0) {

    const proposedAmount = parseInt(parsed.amounts[0]);

    const validation = truthEngine.validateAmendment(
      tradeRef,
      "amount",
      proposedAmount
    );

    if (validation && validation.valid) {

      amendmentEngine.attachAmendments(trade, [{
        field: "amount",
        oldValue: trade.amount,
        newValue: proposedAmount,
        source: "USER",
        status: "PENDING",
        timestamp: Date.now()
      }]);

    }
  }

  // ✅ KEEP FO RESPONSE SIMULATION SAME
  communicationEngine.scheduleReply(
    tradeRef,
    subject,
    message
  );

  res.json({ success: true });
});

// 🔧 CLOCK FIX END

app.post("/api/trade/action",(req,res)=>{

  try{

    let {trade,action,userId,issueType,comment}=req.body;
	const sessionTrade = activeQueues[userId]?.trades.find(
  t => t.tradeRef === trade.tradeRef
);

if (!sessionTrade) {
  return res.status(404).json({ error: "Trade not found in session" });
}

// 🔥 CRITICAL: Always use session object
trade = sessionTrade;

    if(!trade){
      return res.status(400).json({error:"Trade object required"});
    }

    if(!userId){
      return res.status(400).json({error:"userId required"});
    }

    if(!comment || comment.trim() === ""){
      return res.status(400).json({
        error: "Comment is mandatory"
      });
    }

    const userQueue = activeQueues[userId];

    if(!userQueue){
      return res.status(400).json({error:"No active queue"});
    }

    userQueue.lastActiveAt = new Date();

    const currentStatus = trade.currentStatus;

    const allowedActions = {
      MO_VALIDATE_PASS: ["MO_PENDING","MO_VALIDATION","PENDING_FO_RESPONSE"],
      MO_RAISE_BREAK: ["MO_PENDING","MO_VALIDATION"],
      MO_SEND_TO_FO: ["MO_BREAK_OPEN"],

      SIMULATE_FO_RESPONSE: ["PENDING_FO_RESPONSE"],

      CONFIRM_TRADE: ["CONFIRMATION_PENDING"],
      CONFIRM_RAISE_BREAK: ["CONFIRMATION_PENDING"],
      CONFIRM_SEND_TO_CPTY: ["CONFIRMATION_PENDING"],
      CONFIRM_SEND_BACK_TO_MO: ["CONFIRMATION_BREAK"],

      SETTLEMENT_APPROVE: ["SETTLEMENT_PENDING"],
      SETTLEMENT_RAISE_BREAK: ["READY_FOR_APPROVAL"],
      SETTLEMENT_FOLLOW_UP_CPTY: ["SETTLEMENT_BREAK"]
    };

    if (!allowedActions[action] || !allowedActions[action].includes(currentStatus)) {
      return res.status(400).json({ error: "Invalid action for current state" });
    }

    if (
      action === "MO_VALIDATE_PASS" &&
      currentStatus === "PENDING_FO_RESPONSE" &&
      !trade.foResponseReceived
    ) {
      return res.status(400).json({ error: "Await FO response before validating" });
    }

    let nextStatus;
    let nextDesk;

    switch(action){

    case "MO_VALIDATE_PASS":

  // 🚨 Ensure conversation is resolved before applying amendments
      if (trade.pendingAmendments && trade.pendingAmendments.length > 0) {
      if (!trade.conversation || trade.conversation.status !== "RESOLVED") {
      return res.status(400).json({
         error: "Resolve conversation before validating amendments"
      });
    }
  }

        nextStatus = "CONFIRMATION_PENDING";
        nextDesk = "CONFIRMATION";

      // ✅ Apply accepted amendments
      if (trade.pendingAmendments) {
        trade.pendingAmendments.forEach(a => {
      if (a.status === "ACCEPTED") {
        trade[a.field] = a.newValue;
      }
    });

       // Clear after applying
         trade.pendingAmendments = [];
  }

break;

      case "MO_RAISE_BREAK":
        nextStatus="MO_BREAK_OPEN";
        nextDesk="MO";
      break;

case "SIMULATE_FO_RESPONSE":

  // 🔥 Find trade inside USER SESSION
  const sessionTrade = userQueue.trades.find(
    t => t.tradeRef === trade.tradeRef
  );

  if (!sessionTrade) {
    return res.status(404).json({ error: "Trade not found in session" });
  }

  // ✅ Update SESSION trade (NOT request object)
  sessionTrade.foResponseReceived = true;
  
  sessionTrade.currentStatus = "MO_PENDING";

  // ✅ Add FO message
  conversationEngine.createMessage(
    sessionTrade.tradeRef,
    "FO",
    "FO Response",
    "FO has responded to the query"
  );

  return res.json({
    success: true,
    trades: userQueue.trades
  });

      case "MO_SEND_TO_FO":

        nextStatus = "PENDING_FO_RESPONSE";
        trade.foResponseReceived = false;
        nextDesk = "MO";

        conversationEngine.createMessage(
        trade.tradeRef,
        "USER",
         "FO Clarification Request",
        comment
  );

        communicationEngine.scheduleReply(
        trade.tradeRef,
        "RE: FO Clarification",
        "Counterparty reviewing the issue"
  );

     break;

      case "CONFIRM_TRADE":
        nextStatus="SETTLEMENT_PENDING";
        nextDesk="SETTLEMENT";
      break;

      case "CONFIRM_RAISE_BREAK":
        nextStatus="CONFIRMATION_BREAK";
        nextDesk="CONFIRMATION";
      break;

     case "CONFIRM_SEND_TO_CPTY":

  nextStatus = "PENDING_CPTY_RESPONSE";
  nextDesk = "CONFIRMATION";

  // ✅ USER MESSAGE
  conversationEngine.createMessage(
    trade.tradeRef,
    "USER",
    "Trade Confirmation Request",
    comment
  );

    communicationEngine.scheduleReply(
    trade.tradeRef,
      "RE:Trade Confirmation Request",
      "Counterparty reviewing trade"
);

      break;

      case "CONFIRM_SEND_BACK_TO_MO":
        nextStatus="MO_BREAK_OPEN";
        nextDesk="MO";
      break;

      case "SETTLEMENT_APPROVE":
        nextStatus="READY_FOR_APPROVAL";
        nextDesk="SETTLEMENT";
      break;

      case "SETTLEMENT_RAISE_BREAK":
        nextStatus="SETTLEMENT_BREAK";
        nextDesk="SETTLEMENT";
      break;

      case "SETTLEMENT_FOLLOW_UP_CPTY":

        nextStatus = "PENDING_CPTY_RESPONSE";
        nextDesk = "SETTLEMENT";

        // ✅ USER MESSAGE
        conversationEngine.createMessage(
        trade.tradeRef,
        "USER",
        "Settlement Follow-up",
        comment
);

  // ✅ Schedule reply
        communicationEngine.scheduleReply(
        trade.tradeRef,
        "RE: Settlement Follow-up",
        "Awaiting settlement confirmation"
);

     break;

      case "SETTLEMENT_SEND_BACK_TO_MO":
        nextStatus="PENDING_FO_RESPONSE";
        nextDesk="MO";
      break;

      default:
        return res.status(400).json({error:"Invalid action"});
}
      if(!trade || !trade.tradeRef){
        throw new Error("Invalid trade object");
}
      const updatedTrade = LifecycleEngine.transition(trade,nextStatus);
      updatedTrade.nextDesk = nextDesk;

      const index = userQueue.trades.findIndex(
      t => t.tradeRef === trade.tradeRef
);

    if(index !== -1){
      userQueue.trades[index] = updatedTrade;
}

    auditEngine.recordEvent(
      updatedTrade.tradeRef,
      "USER",
      "TRADE_ACTION",
      action,
      {
        issueType,
        comment
      }
);

    scoringEngine.evaluateAction(updatedTrade,action,issueType,userId);

    res.json({
      success:true,
      queueSize: userQueue.trades.length,
      trades: userQueue.trades
    });

    }catch(err){
    res.status(500).json({error:err.message});
    }
});

// 🔧 CLOCK FIX START (EOD AUTO LOGOUT)

setInterval(() => {

  const simTime = simulationClock.getTime();

  if (simTime.getHours() >= 18) {

    console.log("EOD — closing all sessions");

    Object.keys(activeQueues).forEach(userId => {

      const session = activeQueues[userId];

      session.trades.forEach(trade => {
        boxPool.returnTrade(trade);
      });

      delete activeQueues[userId];

    });

  }

}, 60000);

setInterval(() => {
communicationEngine.processReplies(
  conversationEngine,
  (tradeRef) => {
      // 🔍 LOOP ALL ACTIVE USER SESSIONS
      for (const userId in activeQueues) {

        const session = activeQueues[userId];

        if (!session || !session.trades) continue;

        const trade = session.trades.find(
          t => t.tradeRef === tradeRef
        );

        if (trade) return trade;
      }

      return null;
    }
  );
}, 3000);

// 🔧 CLOCK FIX END

app.get("/api/admin/bot-config", (req, res) => {
  res.json(getConfig());
});

app.post("/api/admin/bot-config", (req, res) => {

  const { enabled, movementPercent, runIntervalMs } = req.body;

  updateConfig({
    enabled,
    movementPercent,
    runIntervalMs
  });

  res.json({
    success: true,
    config: getConfig()
  });

});

// 🔧 COMMUNICATION RESPONSE VIEWER
app.get("/api/conversation/:tradeRef", (req, res) => {

  const { tradeRef } = req.params;

  const conversation = conversationEngine.getConversation(tradeRef);

  // ✅ SAFE DEFAULT (NO CRASH)
  if (!conversation) {
    return res.json({
      success: true,
      subject: `Trade ${tradeRef}`,
      messages: []
    });
  }

  // ✅ CONSISTENT RESPONSE
  return res.json({
    success: true,
    subject: conversation.subject,
    messages: conversation.messages
  });

});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Simulation Clock Ready (starts on queue generation)");
});