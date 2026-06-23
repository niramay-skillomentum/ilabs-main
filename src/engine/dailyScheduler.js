// ======================================
// DAILY SCHEDULER
// Periodic maintenance tasks
// ======================================

const Trade = require("../models/Trade");

class DailyScheduler {

  async runDailyCycle() {
    console.log("Running Daily Cycle...");

    try {
      // Update age for all trades based on value date
      const now = new Date();
      const trades = await Trade.find({ assignedTo: { $ne: null } }).lean();

      for (const trade of trades) {
        if (trade.valueDate) {
          const vd = new Date(trade.valueDate);
          const diffTime = now - vd;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays !== trade.age) {
            await Trade.updateOne(
              { tradeRef: trade.tradeRef },
              { $set: { age: diffDays } }
            );
          }
        }
      }

      console.log("Daily evaluation complete");
    } catch (err) {
      console.error("Daily cycle error:", err.message);
    }
  }

}

module.exports = new DailyScheduler();