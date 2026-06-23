require("dotenv").config();
const mongoose = require("mongoose");
const Conversation = require("./src/models/Conversation");
const Trade = require("./src/models/Trade");
const Queue = require("./src/models/Queue");
const User = require("./src/models/User");
const UserScore = require("./src/models/UserScore");
const AuditLog = require("./src/models/AuditLog");

async function clean() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Deleting all data from all collections...");
    const convRes = await Conversation.deleteMany({});
    const tradeRes = await Trade.deleteMany({});
    const queueRes = await Queue.deleteMany({});
    const userRes = await User.deleteMany({});
    const scoreRes = await UserScore.deleteMany({});
    const auditRes = await AuditLog.deleteMany({});

    console.log(`Deleted ${convRes.deletedCount} conversations.`);
    console.log(`Deleted ${tradeRes.deletedCount} trades.`);
    console.log(`Deleted ${queueRes.deletedCount} queues.`);
    console.log(`Deleted ${userRes.deletedCount} users.`);
    console.log(`Deleted ${scoreRes.deletedCount} user scores.`);
    console.log(`Deleted ${auditRes.deletedCount} audit logs.`);

    console.log("Successfully deleted all data from the DB.");

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

clean();
