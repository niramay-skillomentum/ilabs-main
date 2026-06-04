const boxPool = require("./boxPool");

class QueueComposer {

  constructor() {
    this.difficultyRules = {
      BEGINNER: { clean: 12, breaks: 8 },
      INTERMEDIATE: { clean: 10, breaks: 10 },
      ADVANCED: { clean: 6, breaks: 14 }
    };
  }

  buildQueue(desk, difficulty = "BEGINNER") {

    boxPool.evaluateTrades();

    const rule = this.difficultyRules[difficulty];

    const cleanTarget = rule.clean;
    const breakTarget = rule.breaks;

    const deskTrades = boxPool.getTradesForDesk(desk);

    // ✅ Lifecycle-based break classification
    function isBreak(trade) {
      return trade.currentStatus && trade.currentStatus.includes("BREAK");
    }

    const cleanTrades = deskTrades.filter(t => !isBreak(t));
    const breakTrades = deskTrades.filter(t => isBreak(t));

    let selectedClean = this.randomPick(cleanTrades, cleanTarget);
    let selectedBreaks = this.randomPick(breakTrades, breakTarget);

    const breakShortage = breakTarget - selectedBreaks.length;

    if (breakShortage > 0) {
      const injected = this.injectBackdatedTrades(desk, breakShortage);

      // Ensure injected trades exist in BOX
      injected.forEach(trade => {
        boxPool.returnTrade(trade);
      });

      selectedBreaks = selectedBreaks.concat(injected);
    }

    let queue = [...selectedClean, ...selectedBreaks];

    [...selectedClean, ...selectedBreaks].forEach(trade => {
      boxPool.removeTrade(trade.tradeRef);
    });

    const TOTAL = cleanTarget + breakTarget;

    if (queue.length < TOTAL) {
      const filler = boxPool.pullRandomTrades(desk, TOTAL - queue.length);
      queue = queue.concat(filler);
    }

    // =========================================
    // ✅ FIX: DEDUPLICATION (D13 RESOLUTION)
    // =========================================

    const uniqueMap = new Map();

    queue.forEach(trade => {
      if (!uniqueMap.has(trade.tradeRef)) {
        uniqueMap.set(trade.tradeRef, trade);
      }
    });

    const uniqueQueue = Array.from(uniqueMap.values());

    return this.shuffle(uniqueQueue);
  }

  injectBackdatedTrades(desk, count) {

    const trades = [];

    for (let i = 0; i < count; i++) {

      const date = new Date();
      date.setDate(date.getDate() - (Math.floor(Math.random()*3)+1));

      // ✅ Correct lifecycle mapping
      let breakStatus;

      if (desk === "MO") {
        breakStatus = "MO_BREAK_OPEN";
      } else if (desk === "CONFIRMATION") {
        breakStatus = "CONFIRMATION_BREAK";
      } else if (desk === "SETTLEMENT") {
        breakStatus = "SETTLEMENT_BREAK";
      } else {
        breakStatus = desk + "_PENDING";
      }

      // 🔥 PRE-CALCULATE (SAFE)
      const baseAmount = Math.floor(Math.random() * 900000) + 100000;

      const bookingAmount = baseAmount - 50000;
      const truthAmount = baseAmount;

      trades.push({
        tradeRef: "BD_" + Date.now() + "_" + i,
        originType: "BACKDATED_BOOKING",

        tradeDate: new Date(),
        valueDate: date,

        counterparty: "CITI",
        entity: "GS London",
        foRegion: "EMEA",
        product: "FX",
        tradeType: "OTC",
        settlementType: "Bilateral",
        direction: Math.random() > 0.5 ? "BUY" : "SELL",
        currency: "USD",

        amount: bookingAmount,

        truth: {
          amount: truthAmount
        },

        booking: {
          amount: bookingAmount
        },

        nextDesk: desk,
        currentStatus: breakStatus,
        age: Math.floor(Math.random()*5)+1
      });

    }

    return trades;
  }

  randomPick(array, count) {
    return [...array].sort(() => 0.5 - Math.random()).slice(0, count);
  }

  shuffle(array) {
    return [...array].sort(() => 0.5 - Math.random());
  }

}

module.exports = new QueueComposer();