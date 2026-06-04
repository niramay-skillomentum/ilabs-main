// ======================================
// SCENARIO ENGINE (V2 - DETERMINISTIC)
// ======================================

const breakScenarios = [
  "REFERENCE_MISMATCH",
  "AMOUNT_MISMATCH",
  "SSI_MISMATCH",
  "PAYMENT_NOT_RECEIVED",
  "VALUE_DATE_MISMATCH",
  "TIMING_DIFFERENCE"
];

function generateScenario(difficulty) {

  const totalTrades = 20;

  let cleanTrades;
  let breakTrades;

  if (difficulty === "BEGINNER") {
    cleanTrades = Math.floor(Math.random() * 3) + 10;
    breakTrades = totalTrades - cleanTrades;
  } else {
    cleanTrades = Math.floor(Math.random() * 3) + 7;
    breakTrades = totalTrades - cleanTrades;
  }

  const scenarios = [];

  // ==============================
  // CLEAN TRADES
  // ==============================
  for (let i = 0; i < cleanTrades; i++) {

    const amount = Math.floor(Math.random() * 900000) + 100000;
    const valueDate = new Date(Date.now() + (i * 86400000)).toISOString();

    scenarios.push({
      tradeRef: `T${Date.now()}_${i}`,
      breakType: null,
      status: "CLEAN",

      truth: {
        amount,
        valueDate
      },

      booking: {
        amount,
        valueDate
      }
    });
  }

  // ==============================
  // BREAK TRADES
  // ==============================
  for (let i = 0; i < breakTrades; i++) {

    const breakType = breakScenarios[Math.floor(Math.random() * breakScenarios.length)];

    const amount = Math.floor(Math.random() * 900000) + 100000;
    const valueDate = new Date(Date.now() + (i * 86400000)).toISOString();

    let bookingAmount = amount;
    let bookingValueDate = valueDate;

    // 🔥 Apply mismatch
    if (breakType === "AMOUNT_MISMATCH") {
      bookingAmount = amount - 50000;
    }

    if (breakType === "VALUE_DATE_MISMATCH") {
      const d = new Date(valueDate);
      d.setDate(d.getDate() + 1);
      bookingValueDate = d.toISOString();
    }

    scenarios.push({
      tradeRef: `T${Date.now()}_B${i}`,
      breakType,
      status: "BREAK",

      truth: {
        amount,
        valueDate
      },

      booking: {
        amount: bookingAmount,
        valueDate: bookingValueDate
      }
    });
  }

  return scenarios;
}

module.exports = {
  generateScenario
};