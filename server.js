const express = require("express");
require("dotenv").config();

const { connectDB, getIsConnected } = require("./src/db");
const Trade = require("./src/models/Trade");
const Queue = require("./src/models/Queue");
const User = require("./src/models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sgb_ops_simulator_fallback_secret";

const simulationClock = require("./src/engine/clock");

const conversationEngine = require("./src/engine/conversationEngine");
const aiParser = require("./src/engine/aiParser");
const communicationEngine = require("./src/engine/communicationEngine");
const auditEngine = require("./src/engine/auditEngine");

const queueComposer = require("./src/engine/queueComposer");

const LifecycleEngine = require("./src/engine/lifecycle");

// ✅ S2.9.1
const scoringEngine = require("./src/engine/scoringEngine");

const dailyScheduler = require("./src/engine/dailyScheduler");
const foInternalChannel = require("./src/engine/foInternalChannel");
const confirmationBreakEngine = require("./src/engine/confirmationBreakEngine");
const amendmentEngine = require("./src/engine/amendmentEngine");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================
// SESSION CLEANUP INTERVAL
// Check for expired 3-hour sessions every minute
// ======================================
setInterval(async () => {
  try {
    const cleaned = await queueComposer.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired session(s)`);
    }
  } catch (err) {
    console.warn("Session cleanup error:", err.message);
  }
}, 60000);

// Daily scheduler (age evaluation)
setInterval(() => {
  dailyScheduler.runDailyCycle();
}, 60000);

app.use(express.json());
app.use(express.static("public"));

// ======================================
// JWT AUTHENTICATION MIDDLEWARE
// ======================================
function authenticateToken(req, res, next) {
  // Check Authorization header first
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  // Fallback: check cookie
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc, c) => {
      const [key, val] = c.trim().split("=");
      acc[key] = val;
      return acc;
    }, {});
    token = cookies["auth_token"];
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, fullName }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ======================================
// HELPER: Find trade in DB by ref for a user
// ======================================
async function findUserTrade(tradeRef, userId) {
  return await Trade.findOne({ tradeRef, assignedTo: userId });
}

// ======================================
// HELPER: Get trade by ref (for communication engine callbacks)
// Searches DB for any assigned trade with the given ref
// ======================================
async function getTradeByRefFromDB(tradeRef) {
  const trade = await Trade.findOne({ tradeRef, assignedTo: { $ne: null } });
  return trade;
}

// ======================================
// AUTHENTICATION ROUTES
// ======================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailLower = email.toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const newUser = new User({
      fullName,
      email: emailLower,
      password: hashedPassword
    });
    await newUser.save();

    res.json({ success: true, message: "Registration successful" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailLower = email.toLowerCase();
    const userRecord = await User.findOne({ email: emailLower });

    if (!userRecord) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, userRecord.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Login successful — generate JWT (3 hours to match session)
    const token = jwt.sign(
      { userId: userRecord.email, fullName: userRecord.fullName },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    // Set cookie with token
    res.setHeader("Set-Cookie", `auth_token=${token}; Path=/; Max-Age=${3 * 60 * 60}; SameSite=Lax`);

    res.json({
      success: true,
      token,
      user: {
        email: userRecord.email,
        fullName: userRecord.fullName
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// SESSION INFO ENDPOINT
// Returns current session state from DB
// ======================================
app.get("/api/session/info", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeQueue = await queueComposer.getActiveQueue(userId);

    if (!activeQueue) {
      return res.json({
        success: true,
        hasActiveSession: false,
        userId,
        fullName: req.user.fullName
      });
    }

    res.json({
      success: true,
      hasActiveSession: true,
      userId,
      fullName: req.user.fullName,
      desk: activeQueue.desk,
      queueSize: activeQueue.trades.length,
      sessionStart: activeQueue.sessionStart,
      sessionExpiry: activeQueue.sessionExpiry
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// FO INTERNAL CHANNEL APIs
// ======================================

app.get("/api/fo-channel/list", authenticateToken, async (req, res) => {
  try {
    const desk = req.query.desk;
    const channels = await require("./src/models/FOCommunication").find({ desk }).lean();
    const tradeRefs = channels.map(c => c.tradeRef);
    const trades = await Trade.find({ tradeRef: { $in: tradeRefs } }).lean();

    const tradeMap = {};
    trades.forEach(t => tradeMap[t.tradeRef] = t);

    const result = channels.map(c => {
      const t = tradeMap[c.tradeRef];
      if (!t) return null;
      return {
        trade: t,
        conversation: {
          messages: c.messages.map(m => ({
            sender: m.senderRole === "FO" ? "FO" : (m.sender || "Unknown User"),
            body: m.message,
            timestamp: m.timestamp
          }))
        }
      };
    }).filter(x => x !== null);

    res.json({ success: true, conversations: result });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/fo-channel/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const channel = await foInternalChannel.getChannel(req.params.tradeRef);
    if (!channel) return res.json({ channel: null, messages: [] });
    res.json({ channel: channel.status, messages: channel.messages });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/fo-channel/send", authenticateToken, express.json(), async (req, res) => {
  try {
    const { tradeRef, message } = req.body;
    if (!tradeRef || !message) return res.status(400).json({ error: "Missing fields" });

    const trade = await Trade.findOne({ tradeRef });
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    // Transition state if not already liaising with FO
    if (trade.currentStatus !== "LIASING_WITH_FO" && trade.currentStatus !== "PENDING_FO_RESPONSE") {
      if (trade.currentStatus.startsWith("MO")) {
          trade.currentStatus = "PENDING_FO_RESPONSE";
      } else {
          trade.currentStatus = "LIASING_WITH_FO";
      }
      trade.foResponseReceived = false;
      trade.foEscalation = trade.foEscalation || {};
      trade.foEscalation.escalatedAt = new Date();
      trade.foContactCount = (trade.foContactCount || 0) + 1;
      await trade.save();
    }

    const deskContext = trade.currentStatus === "PENDING_FO_RESPONSE" ? "MO" : "CONFIRMATION";
    await foInternalChannel.openChannel(tradeRef, req.user.userId, deskContext);
    await foInternalChannel.sendMessage(tradeRef, req.user.userId, message, "USER");
    
    // Auto schedule an FO reply based on user's new message
    foInternalChannel.scheduleFOInternalReply(tradeRef, trade, message, deskContext);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================
// QUEUE GENERATION (DB-BACKED)
// ======================================
app.post("/api/queue/generate", authenticateToken, async (req, res) => {
  try {
    const { desk } = req.body;
    const userId = req.user.userId;

    const validDesks = ["MO", "CONFIRMATION", "SETTLEMENT"];
    if (!validDesks.includes(desk)) {
      return res.status(400).json({ error: "Invalid desk specified. Must be MO, CONFIRMATION, or SETTLEMENT" });
    }

    simulationClock.start();

    const result = await queueComposer.buildQueue(desk, userId);

    res.json({
      success: true,
      desk,
      queueSize: result.trades.length,
      trades: result.trades,
      sessionExpiry: result.sessionExpiry
    });

  } catch (err) {
    if (err.message === "Complete your current queue first") {
      return res.json({
        success: false,
        error: err.message
      });
    }
    console.error("Queue generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// GET MY QUEUE (DB-BACKED)
// ======================================
app.get("/api/queue/my", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeQueue = await queueComposer.getActiveQueue(userId);

    if (!activeQueue) {
      return res.status(400).json({ error: "No active queue" });
    }

    // Touch session to track activity
    await queueComposer.touchSession(userId);

    res.json({
      success: true,
      desk: activeQueue.desk,
      queueSize: activeQueue.trades.length,
      trades: activeQueue.trades,
      sessionExpiry: activeQueue.sessionExpiry
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// GET ALL TRADES (DB-BACKED)
// ======================================
app.get("/api/trade/all", authenticateToken, async (req, res) => {
  try {
    const trades = await Trade.find({});
    res.json({
      success: true,
      trades: trades
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// LOGOUT (DB-BACKED)
// ======================================
app.post("/api/session/logout", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await queueComposer.endSession(userId);

    // Clear auth cookie
    res.setHeader("Set-Cookie", "auth_token=; Path=/; Max-Age=0; SameSite=Lax");

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// CLOCK API
// ======================================
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

// ======================================
// CONVERSATION / EMAIL
// ======================================
app.post("/api/conversation/send", authenticateToken, async (req, res) => {
  const { tradeRef, sender, message, desk } = req.body;

  const subject = `Trade ${tradeRef} - Break Investigation`;

  // Save message to MongoDB
  await conversationEngine.createMessage(
    tradeRef,
    sender,
    message,
    subject,
    desk
  );

  // Parse user message
  const parsed = aiParser.parseEmail(message);

  // Find trade in DB
  const trade = await Trade.findOne({ tradeRef, assignedTo: { $ne: null } });

  let auditDetails = "";
  if (trade && (trade.currentStatus.startsWith("MO") || trade.currentStatus === "PENDING_FO_RESPONSE")) {
    // If trade was in MO_BREAK_OPEN, transition it to PENDING_FO_RESPONSE now that the email is sent
    if (trade.currentStatus === "MO_BREAK_OPEN") {
      const LifecycleEngine = require("./src/engine/lifecycle");
      const tradeObj = trade.toObject ? trade.toObject() : trade;
      const updatedTrade = LifecycleEngine.transition(tradeObj, "PENDING_FO_RESPONSE");
      trade.currentStatus = updatedTrade.currentStatus;
      trade.foResponseReceived = false;
      await trade.save();
    }

    // Schedule FO reply for MO desk communication
    communicationEngine.scheduleFOReply(
      tradeRef,
      trade,
      message
    );
    auditDetails = "Sent mail to FO";
  } else {
    // Schedule CPTY reply (for confirmation/settlement desk communication)

    // Check for CPTY concession if booking matches universal truth, FO supports us, and we are manually emailing them
    const truthEngineMail = require("./src/engine/truthEngine");
    if (trade && trade.foEscalation && trade.foEscalation.status === "FO_SUPPORTS_US" && truthEngineMail.getMismatchFields(trade, "universal").length === 0) {
      if (trade.truths && trade.truths.confirmation) {
        trade.truths.confirmation.amount = trade.amount;
        trade.truths.confirmation.valueDate = trade.valueDate;
        trade.truths.confirmation.currency = trade.currency;
        trade.markModified('truths');
      }
    }

    if (desk === "CONFIRMATION") {
      const LifecycleEngine = require("./src/engine/lifecycle");
      const tradeObj = trade.toObject ? trade.toObject() : trade;
      const updatedTrade = LifecycleEngine.transition(tradeObj, "LIASING_WITH_CPTY");
      trade.currentStatus = updatedTrade.currentStatus;
    }

    await trade.save();

    communicationEngine.scheduleReply(
      tradeRef,
      subject,
      message
    );
    auditDetails = "Sent mail to Counterparty";
  }

  auditEngine.recordEvent(
    tradeRef,
    sender,
    "EMAIL_SENT",
    auditDetails
  ).catch(e => console.warn("DB audit:", e.message));

  res.json({ success: true });
});

app.post("/api/conversation/resolve", authenticateToken, async (req, res) => {
  const { tradeRef } = req.body;
  const userId = req.user.userId;

  // Find trade in DB assigned to any user
  let trade = await Trade.findOne({ tradeRef, assignedTo: { $ne: null } });

  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  // Guard: FO must have responded before resolve is allowed
  if (!trade.foResponseReceived) {
    return res.status(400).json({
      error: "Cannot resolve — awaiting FO response"
    });
  }

  // Mark conversation resolved
  trade.conversation = trade.conversation || {};
  trade.conversation.status = "RESOLVED";
  trade.conversation.resolvedAt = new Date();

  // Resolve in DB
  conversationEngine.resolveConversation(tradeRef).catch(e => console.warn("DB resolve:", e.message));

  // Accept all pending amendments
  if (trade.pendingAmendments) {
    trade.pendingAmendments.forEach(a => {
      a.status = "ACCEPTED";
    });
  }

  // Apply accepted amendments
  if (trade.pendingAmendments) {
    trade.pendingAmendments.forEach(a => {
      if (a.status === "ACCEPTED") {
        trade[a.field] = a.newValue;
      }
    });
    trade.pendingAmendments = [];
  }

  // Transition to MO_PENDING
  try {
    const updated = LifecycleEngine.transition(trade.toObject ? trade.toObject() : trade, "MO_PENDING");
    trade.currentStatus = updated.currentStatus;
    trade.nextDesk = "MO";
  } catch (err) {
    console.error("Resolve transition error:", err.message);
    return res.status(400).json({
      error: "Cannot transition trade: " + err.message
    });
  }

  // Save to DB
  await trade.save();

  res.json({
    success: true,
    message: "Conversation resolved — trade moved to MO_PENDING",
    newStatus: trade.currentStatus
  });

  // Audit
  auditEngine.recordEvent(
    trade.tradeRef,
    userId,
    "BREAK_RESOLVED",
    "User resolved the break and applied pending amendments"
  ).catch(e => console.warn("DB audit:", e.message));
});

// ======================================
// TRADE ACTION (DB-BACKED)
// ======================================
app.post("/api/trade/action", authenticateToken, async (req, res) => {
  try {
    let { trade: tradeFromBody, action, issueType, comment } = req.body;
    const userId = req.user.userId;

    // Always fetch from DB — do not trust client trade object
    const sessionTrade = await Trade.findOne({
      tradeRef: tradeFromBody.tradeRef,
      assignedTo: userId
    });

    if (!sessionTrade) {
      return res.status(404).json({ error: "Trade not found in session" });
    }

    if (!comment || comment.trim() === "") {
      return res.status(400).json({
        error: "Comment is mandatory"
      });
    }

    // Touch session
    await queueComposer.touchSession(userId);

    const currentStatus = sessionTrade.currentStatus;

    const allowedActions = {
      MO_VALIDATE_PASS: ["MO_PENDING", "PENDING_FO_RESPONSE"],
      MO_RAISE_BREAK: ["MO_PENDING"],
      MO_SEND_TO_FO: ["MO_BREAK_OPEN"],

      CONFIRM_TRADE: ["CONFIRMATION_PENDING", "LIASING_WITH_CPTY"],
      CONFIRM_RAISE_BREAK: ["LIASING_WITH_CPTY"],
      CONFIRM_SEND_TO_CPTY: ["CONFIRMATION_PENDING", "CONFIRMATION_BREAK", "LIASING_WITH_FO", "LIASING_WITH_CPTY"],
      CONFIRM_REJECT_CLAIM: ["CONFIRMATION_BREAK"],
      CONFIRM_REQUEST_EVIDENCE: ["CONFIRMATION_BREAK"],
      CONFIRM_ESCALATE_TO_FO: ["CONFIRMATION_BREAK"],
      CONFIRM_RAISE_AMENDMENT: ["CONFIRMATION_BREAK"],
      CONFIRM_APPROVE_AMENDMENT: ["CONFIRMATION_BREAK"],
      CONFIRM_RESEND: ["CONFIRMATION_PENDING"],

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
      !sessionTrade.foResponseReceived
    ) {
      return res.status(400).json({ error: "Await FO response before validating" });
    }

    let nextStatus;
    let nextDesk;

    switch (action) {

      case "MO_VALIDATE_PASS":
        // Ensure conversation is resolved before applying amendments
        if (sessionTrade.pendingAmendments && sessionTrade.pendingAmendments.length > 0) {
          if (!sessionTrade.conversation || sessionTrade.conversation.status !== "RESOLVED") {
            return res.status(400).json({
              error: "Resolve conversation before validating amendments"
            });
          }
        }

        nextStatus = "CONFIRMATION_PENDING";
        nextDesk = "CONFIRMATION";

        // Apply accepted amendments
        if (sessionTrade.pendingAmendments) {
          sessionTrade.pendingAmendments.forEach(a => {
            if (a.status === "ACCEPTED") {
              sessionTrade[a.field] = a.newValue;
            }
          });
          sessionTrade.pendingAmendments = [];
        }

        break;

      case "MO_RAISE_BREAK":
        nextStatus = "MO_BREAK_OPEN";
        nextDesk = "MO";
        break;

      case "MO_SEND_TO_FO":
        nextStatus = "PENDING_FO_RESPONSE";
        sessionTrade.foResponseReceived = false;
        nextDesk = "MO";
        break;

      case "CONFIRM_TRADE":
        nextStatus = "SETTLEMENT_PENDING";
        nextDesk = "SETTLEMENT";
        break;

      case "CONFIRM_RAISE_BREAK":
        const cptyCount = sessionTrade.cptyContactCount || 0;
        const foCount = sessionTrade.foContactCount || 0;
        if (cptyCount !== 1 || foCount > 0) {
            return res.status(400).json({ error: "Confirmation Break can only be raised once, after first counterparty contact." });
        }
        nextStatus = "CONFIRMATION_BREAK";
        nextDesk = "CONFIRMATION";
        break;

      case "CONFIRM_REJECT_CLAIM":
        // Reject counterparty's claim, revert to pending
        nextStatus = "CONFIRMATION_PENDING";
        nextDesk = "CONFIRMATION";
        
        // If FO supports us AND booking matches universal truth, pushing back makes CPTY concede
        const truthEngineForReject = require("./src/engine/truthEngine");
        if (sessionTrade.foEscalation && sessionTrade.foEscalation.status === "FO_SUPPORTS_US" && truthEngineForReject.getMismatchFields(sessionTrade, "universal").length === 0) {
          if (sessionTrade.truths && sessionTrade.truths.confirmation) {
            sessionTrade.truths.confirmation.amount = sessionTrade.amount;
            sessionTrade.truths.confirmation.valueDate = sessionTrade.valueDate;
            sessionTrade.truths.confirmation.currency = sessionTrade.currency;
            sessionTrade.markModified('truths');
          }
        }
        break;

      case "CONFIRM_REQUEST_EVIDENCE":
        // Ask counterparty for supporting documents — stays in BREAK
        nextStatus = "CONFIRMATION_BREAK";
        nextDesk = "CONFIRMATION";

        // If FO supports us AND booking matches universal truth, requesting evidence makes CPTY double check and concede
        const truthEngineForEvidence = require("./src/engine/truthEngine");
        if (sessionTrade.foEscalation && sessionTrade.foEscalation.status === "FO_SUPPORTS_US" && truthEngineForEvidence.getMismatchFields(sessionTrade, "universal").length === 0) {
          if (sessionTrade.truths && sessionTrade.truths.confirmation) {
            sessionTrade.truths.confirmation.amount = sessionTrade.amount;
            sessionTrade.truths.confirmation.valueDate = sessionTrade.valueDate;
            sessionTrade.truths.confirmation.currency = sessionTrade.currency;
            sessionTrade.markModified('truths');
          }
        }

        // Record evidence request
        if (!sessionTrade.confirmationScenario) {
          sessionTrade.confirmationScenario = { evidence: [] };
        }
        if (!sessionTrade.confirmationScenario.evidence) {
          sessionTrade.confirmationScenario.evidence = [];
        }
        sessionTrade.confirmationScenario.evidence.push({
          type: "EVIDENCE_REQUEST",
          provided: false,
          requestedAt: new Date()
        });

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Evidence Request - Trade " + sessionTrade.tradeRef
        );

        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Evidence Request",
          "Evidence documentation requested"
        );
        break;

      case "CONFIRM_ESCALATE_TO_FO":
        nextStatus = "LIASING_WITH_FO";
        nextDesk = "CONFIRMATION";
        sessionTrade.foResponseReceived = false;

        // Update FO escalation
        sessionTrade.foEscalation = sessionTrade.foEscalation || {};
        sessionTrade.foEscalation.status = "PENDING";
        sessionTrade.foEscalation.escalatedAt = new Date();

        // Open FO internal channel and send the message
        sessionTrade.foContactCount = (sessionTrade.foContactCount || 0) + 1;
        await foInternalChannel.openChannel(sessionTrade.tradeRef, userId, "CONFIRMATION");
        await foInternalChannel.sendMessage(sessionTrade.tradeRef, userId, comment, "USER");
        foInternalChannel.scheduleFOInternalReply(
          sessionTrade.tradeRef,
          sessionTrade,
          comment,
          "CONFIRMATION"
        );
        break;

      case "CONFIRM_RAISE_AMENDMENT":
        // Raise an amendment — stays in BREAK until approved
        nextStatus = "CONFIRMATION_BREAK";
        nextDesk = "CONFIRMATION";
        break;

      case "CONFIRM_APPROVE_AMENDMENT":
        // Approve and apply pending amendments, recheck
        nextStatus = "CONFIRMATION_PENDING";
        nextDesk = "CONFIRMATION";

        // Accept and apply all pending amendments
        if (sessionTrade.pendingAmendments) {
          sessionTrade.pendingAmendments.forEach(a => {
            a.status = "ACCEPTED";
          });
          amendmentEngine.applyAllAccepted(sessionTrade, userId);
        }
        break;

      case "CONFIRM_RESEND":
        // Resend confirmation after amendment
        nextStatus = "LIASING_WITH_CPTY";
        nextDesk = "CONFIRMATION";

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Trade Confirmation (Amended)"
        );

        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Trade Confirmation (Amended)",
          "Counterparty reviewing amended confirmation"
        );
        break;

      case "CONFIRM_SEND_TO_CPTY":
        nextStatus = "LIASING_WITH_CPTY";
        nextDesk = "CONFIRMATION";
        sessionTrade.cptyResponseReceived = false;
        
        sessionTrade.cptyContactCount = (sessionTrade.cptyContactCount || 0) + 1;

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Trade Confirmation Request"
        );

        // Schedule proactive response from CPTY
        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Trade Confirmation Request",
          comment,
          "CONFIRMATION"
        );
        break;

      case "CONFIRM_SEND_BACK_TO_MO":
        nextStatus = "MO_BREAK_OPEN";
        nextDesk = "MO";
        break;

      case "SETTLEMENT_APPROVE":
        nextStatus = "READY_FOR_APPROVAL";
        nextDesk = "SETTLEMENT";
        break;

      case "SETTLEMENT_RAISE_BREAK":
        nextStatus = "SETTLEMENT_BREAK";
        nextDesk = "SETTLEMENT";
        break;

      case "SETTLEMENT_FOLLOW_UP_CPTY":
        nextStatus = "LIASING_WITH_CPTY";
        nextDesk = "SETTLEMENT";

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Settlement Follow-up"
        );

        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Settlement Follow-up",
          "Awaiting settlement confirmation"
        );

        break;

      case "SETTLEMENT_SEND_BACK_TO_MO":
        nextStatus = "PENDING_FO_RESPONSE";
        nextDesk = "MO";
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    // Perform lifecycle transition
    const tradeObj = sessionTrade.toObject ? sessionTrade.toObject() : sessionTrade;
    const updatedTrade = LifecycleEngine.transition(tradeObj, nextStatus);

    // Update trade in DB
    sessionTrade.currentStatus = updatedTrade.currentStatus;
    sessionTrade.nextDesk = nextDesk;
    await sessionTrade.save();

    // Fetch updated queue for response
    const activeQueue = await queueComposer.getActiveQueue(userId);
    const trades = activeQueue ? activeQueue.trades : [];

    // Respond
    res.json({
      success: true,
      queueSize: trades.length,
      trades: trades
    });

    // Audit (fire-and-forget)
    auditEngine.recordEvent(
      sessionTrade.tradeRef,
      userId,
      action,
      comment || "Action taken on trade"
    ).catch(e => console.warn("DB audit:", e.message));

    // scoringEngine.evaluateAction(updatedTrade, action, issueType, userId)
    //  .catch(e => console.warn("DB score:", e.message));

  } catch (err) {
    console.error("Trade action error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// COMMUNICATION REPLY PROCESSORS
// Now use DB lookups instead of activeQueues
// ======================================
setInterval(() => {
  communicationEngine.processReplies(
    conversationEngine,
    (tradeRef) => {
      // Synchronous wrapper — communication engine expects sync return
      // We return a promise-like approach using a cached trade
      return communicationEngine._cachedTrades?.[tradeRef] || null;
    },
    async (trade) => {
      const Trade = require("./src/models/Trade");
      await Trade.updateOne({ tradeRef: trade.tradeRef }, {
        $set: {
          cptyResponseReceived: trade.cptyResponseReceived,
          pendingAmendments: trade.pendingAmendments
        }
      });
    }
  );
}, 3000);

// FO REPLY PROCESSOR
setInterval(() => {
  communicationEngine.processFOReplies(
    conversationEngine,
    (tradeRef) => {
      return communicationEngine._cachedTrades?.[tradeRef] || null;
    },
    async (trade) => {
      const Trade = require("./src/models/Trade");
      await Trade.updateOne({ tradeRef: trade.tradeRef }, {
        $set: {
          foResponseReceived: trade.foResponseReceived,
          currentStatus: trade.currentStatus,
          pendingAmendments: trade.pendingAmendments
        }
      });
    }
  );
}, 3000);

// FO INTERNAL CHANNEL PROCESSOR
setInterval(() => {
  foInternalChannel.processFOInternalReplies(
    async (trade) => {
      await Trade.updateOne({ tradeRef: trade.tradeRef }, {
        $set: {
          foEscalation: trade.foEscalation,
          foResponseReceived: true,
          currentStatus: trade.foEscalation?.status === "FO_INVESTIGATING" ? trade.currentStatus : "CONFIRMATION_BREAK"
        }
      });
    }
  );
}, 3000);

// Cache refresh: periodically load assigned trades for communication engine callbacks
setInterval(async () => {
  try {
    const assignedTrades = await Trade.find({ assignedTo: { $ne: null } }).lean();
    if (!communicationEngine._cachedTrades) {
      communicationEngine._cachedTrades = {};
    }
    communicationEngine._cachedTrades = {};
    assignedTrades.forEach(t => {
      communicationEngine._cachedTrades[t.tradeRef] = t;
    });
  } catch (err) {
    // Silent — cache refresh failure is non-critical
  }
}, 2000);

// ======================================
// SHARED MAILBOX ENDPOINT (DB-BACKED)
// ======================================
app.get("/api/conversations/shared", authenticateToken, async (req, res) => {
  const { desk } = req.query;
  const results = [];
  const processedTradeRefs = new Set();

  try {
    const Conversation = require("./src/models/Conversation");

    // Fetch conversations from DB where this desk ever participated
    if (desk) {
      const dbConversations = await Conversation.find({ desks: desk }).lean();
      for (const conv of dbConversations) {
        if (processedTradeRefs.has(conv.tradeRef)) continue;
        if (conv.messages && conv.messages.length > 0) {
          results.push({ tradeRef: conv.tradeRef, conversation: conv });
          processedTradeRefs.add(conv.tradeRef);
        }
      }
    }

    // Also check for trades assigned to users on this desk
    if (desk) {
      const activeQueues = await Queue.find({ desk, isActive: true }).lean();
      for (const q of activeQueues) {
        for (const tradeRef of q.trades) {
          if (processedTradeRefs.has(tradeRef)) continue;
          const conv = await conversationEngine.getConversation(tradeRef);
          if (conv && conv.messages && conv.messages.length > 0) {
            results.push({ tradeRef, conversation: conv });
            processedTradeRefs.add(tradeRef);
          }
        }
      }
    }

    // Resolve trades for all collected conversations
    const finalResults = [];
    for (const item of results) {
      let trade = await Trade.findOne({ tradeRef: item.tradeRef }).lean();

      if (!trade) {
        trade = {
          tradeRef: item.tradeRef,
          counterparty: "Unknown (Archived)",
          currency: "N/A",
          amount: 0,
          currentStatus: item.conversation.status || "OPEN"
        };
      }

      finalResults.push({
        trade,
        conversation: {
          subject: item.conversation.messages[0]?.subject || item.conversation.subject || `Trade ${item.tradeRef}`,
          status: item.conversation.status,
          messages: item.conversation.messages.map(m => ({
            sender: m.sender,
            body: m.body,
            subject: m.subject,
            timestamp: m.timestamp
          }))
        }
      });
    }

    // Sort by latest message
    finalResults.sort((a, b) => {
      const aLast = a.conversation.messages[a.conversation.messages.length - 1];
      const bLast = b.conversation.messages[b.conversation.messages.length - 1];
      return (bLast.timestamp || 0) - (aLast.timestamp || 0);
    });

    res.json({ success: true, conversations: finalResults });

  } catch (err) {
    console.error("Shared inbox error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// PERSONAL INBOX ENDPOINT (DB-BACKED)
// ======================================
app.get("/api/conversations/personal", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const Conversation = require("./src/models/Conversation");
    const conversations = await Conversation.find({
      "messages.sender": userId
    }).lean();

    const results = [];

    for (const conv of conversations) {
      let trade = await Trade.findOne({ tradeRef: conv.tradeRef }).lean();

      if (!trade) {
        trade = {
          tradeRef: conv.tradeRef,
          counterparty: "Unknown (Archived)",
          currency: "N/A",
          amount: 0,
          currentStatus: conv.status
        };
      }

      results.push({
        trade,
        conversation: {
          subject: conv.messages[0]?.subject || `Trade ${conv.tradeRef}`,
          status: conv.status,
          messages: conv.messages.map(m => ({
            sender: m.sender,
            body: m.body,
            subject: m.subject,
            timestamp: m.timestamp
          }))
        }
      });
    }

    results.sort((a, b) => {
      const aLast = a.conversation.messages[a.conversation.messages.length - 1];
      const bLast = b.conversation.messages[b.conversation.messages.length - 1];
      return (bLast.timestamp || 0) - (aLast.timestamp || 0);
    });

    res.json({ success: true, conversations: results });

  } catch (err) {
    console.error("Personal inbox error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// CONVERSATION VIEWER
// ======================================
app.get("/api/conversation/:tradeRef", authenticateToken, async (req, res) => {
  const { tradeRef } = req.params;

  const conversation = await conversationEngine.getConversation(tradeRef);

  if (!conversation) {
    return res.json({
      success: true,
      subject: `Trade ${tradeRef}`,
      messages: []
    });
  }

  return res.json({
    success: true,
    subject: conversation.subject,
    messages: conversation.messages
  });
});

// ======================================
// AUDIT TRAIL
// ======================================
app.get("/api/audit/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;

    // Get manual audit logs from AuditLog collection
    const auditTrail = await auditEngine.getAuditTrail(tradeRef);

    // Also get the XML audit from the trade itself (auto-generated history)
    const trade = await Trade.findOne({ tradeRef }).lean();
    let xmlAudit = null;
    if (trade && trade.auditXml) {
      xmlAudit = trade.auditXml;
    }

    res.json({
      trail: auditTrail || [],
      xmlAudit: xmlAudit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// FO INTERNAL CHANNEL ENDPOINTS
// ======================================

// Get FO internal channel messages for a trade
app.get("/api/fo-channel/:tradeRef", authenticateToken, async (req, res) => {
  const { tradeRef } = req.params;
  const channel = foInternalChannel.getChannel(tradeRef);

  if (!channel) {
    return res.json({ success: true, channel: null, messages: [] });
  }

  res.json({
    success: true,
    channel: {
      tradeRef: channel.tradeRef,
      status: channel.status,
      openedBy: channel.openedBy,
      openedAt: channel.openedAt
    },
    messages: channel.messages
  });
});

// Send a message on the FO internal channel
app.post("/api/fo-channel/send", authenticateToken, async (req, res) => {
  const { tradeRef, message } = req.body;
  const userId = req.user.userId;

  if (!tradeRef || !message) {
    return res.status(400).json({ error: "tradeRef and message are required" });
  }

  // Open channel if not exists
  foInternalChannel.openChannel(tradeRef, userId, "CONFIRMATION");

  // Send user's message
  foInternalChannel.sendMessage(tradeRef, userId, message, "USER");

  // Get trade for FO context
  const trade = await Trade.findOne({ tradeRef });
  if (trade) {
    foInternalChannel.scheduleFOInternalReply(tradeRef, trade, message, "CONFIRMATION");

    // Transition state
    try {
      const LifecycleEngine = require("./src/engine/lifecycle");
      const tradeObj = trade.toObject ? trade.toObject() : trade;
      const updatedTrade = LifecycleEngine.transition(tradeObj, "LIASING_WITH_FO");
      trade.currentStatus = updatedTrade.currentStatus;
      await trade.save();
    } catch (e) {
      console.warn("Could not transition to LIASING_WITH_FO:", e.message);
    }
  }

  res.json({ success: true });
});

// ======================================
// SERVER START (NO BOXPOOL)
// ======================================
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Simulation Clock Ready (starts on queue generation)");
  });
}

startServer();