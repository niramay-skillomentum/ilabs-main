const boxPool = require("./boxPool");
const LifecycleEngine = require("./lifecycle");

class LifecycleBot {

  runBot() {

    const pool = boxPool.viewPool();

    console.log("BOT RUN | POOL:", pool.length);

    if (pool.length === 0) {
      console.log("BOT: No trades in pool");
      return;
    }

    const eligibleTrades = pool.filter(t =>
      t.currentStatus === "MO_BREAK_OPEN" ||
      t.currentStatus === "PENDING_FO_RESPONSE" ||
      t.currentStatus === "CONFIRMATION_BREAK" ||
      t.currentStatus === "SETTLEMENT_BREAK" ||
      t.currentStatus === "PENDING_CPTY_RESPONSE"
    );

    console.log("BOT ELIGIBLE:", eligibleTrades.length);

    if (eligibleTrades.length === 0) {
      console.log("BOT: No eligible trades");
      return;
    }

    // RANDOM 50%
    const shuffled = eligibleTrades.sort(() => 0.5 - Math.random());
    const { getConfig } = require("./botConfig");
    const config = getConfig();

    const percent = config.movementPercent / 100;
    const moveCount = Math.floor(shuffled.length * percent);
    const selected = shuffled.slice(0, moveCount);

    let moved = 0;

    selected.forEach(trade => {

      try {

        let nextStatus;

        // MO
        if (trade.currentStatus === "MO_BREAK_OPEN") {
          nextStatus = "PENDING_FO_RESPONSE";
        }

        else if (trade.currentStatus === "PENDING_FO_RESPONSE") {
          nextStatus = Math.random() < 0.5
            ? "MO_VALIDATION"
            : "MO_BREAK_OPEN";
        }

        // CONFIRMATION
        else if (trade.currentStatus === "CONFIRMATION_BREAK") {
          nextStatus = "PENDING_CPTY_RESPONSE";
        }

        else if (trade.currentStatus === "PENDING_CPTY_RESPONSE") {
          nextStatus = Math.random() < 0.5
            ? "CONFIRMATION_PENDING"
            : "CONFIRMATION_BREAK";
        }

        // SETTLEMENT
        else if (trade.currentStatus === "SETTLEMENT_BREAK") {
          nextStatus = "PENDING_CPTY_RESPONSE";
        }

        if (nextStatus) {

          const oldStatus = trade.currentStatus; // ✅ ADDED

          const updated = LifecycleEngine.transition(trade, nextStatus);

          // ✅ FIX: SAFE REPLACEMENT (NO MUTATION)
          const index = pool.findIndex(t => t.tradeRef === trade.tradeRef);

          if (index !== -1) {
            pool[index] = { ...updated };
          }

          console.log(
            "BOT MOVE:",
            trade.tradeRef,
            "|",
            oldStatus,
            "→",
            nextStatus
          ); // ✅ ADDED

          moved++;
        }

      } catch (err) {
        console.error("BOT ERROR:", err.message);
      }

    });

    console.log("BOT MOVED:", moved);

  }

}

module.exports = new LifecycleBot();