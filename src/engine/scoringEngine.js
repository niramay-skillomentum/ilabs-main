// ✅ SCORING ENGINE (MONGODB + FALLBACK)

const { getIsConnected } = require("../db");
let UserScore;
try {
  UserScore = require("../models/UserScore");
} catch (e) {
  UserScore = null;
}

// In-memory fallback
const userScores = {};

async function evaluateAction(trade, action, issueType, userId) {

  if (!userScores[userId]) {
    userScores[userId] = 0;
  }

  let scoreDelta = 0;

  if (action.includes("VALIDATE")) {
    scoreDelta += 5;
  }

  if (action.includes("RAISE_BREAK")) {
    scoreDelta += 3;
  }

  if (issueType) {
    scoreDelta += 2;
  }

  userScores[userId] += scoreDelta;

  // Persist to DB if connected (fire-and-forget)
  if (getIsConnected() && UserScore) {
    UserScore.findOneAndUpdate(
      { userId },
      {
        $inc: { points: scoreDelta },
        $push: {
          history: {
            tradeRef: trade.tradeRef,
            action,
            pointsAwarded: scoreDelta,
            timestamp: new Date()
          }
        }
      },
      { upsert: true, returnDocument: 'after' }
    ).catch(err => console.warn("DB score write:", err.message));
  }

  return {
    scoreDelta,
    total: userScores[userId]
  };
}

module.exports = {
  evaluateAction
};