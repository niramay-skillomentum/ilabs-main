// ---------------------------------
// Settlement Break Engine
// ---------------------------------

const LifecycleEngine = require("./lifecycle"); // ✅ added

function investigateBreak(trade) {

  if (trade.cptyStatus !== "DISCREPANCY") {
    throw new Error("No discrepancy present for investigation");
  }

  return {
    message: "Investigation started",
    tradeId: trade.id,
    status: trade.cptyStatus
  };

}


// ---------------------------------
// Resolve Break
// ---------------------------------

function resolveBreak(trade, selectedCause) {

  if (trade.cptyStatus !== "DISCREPANCY") {
    throw new Error("Break resolution not allowed");
  }

  const actualCause = trade.actualDiscrepancyReason;

  let correct = false;

  if (selectedCause === actualCause) {
    correct = true;
  }

  // mark resolution
  trade.breakResolved = true;
  trade.userSelectedCause = selectedCause;

  // ✅ FIX: lifecycle controlled transition
  const updatedTrade = LifecycleEngine.transition(trade, "SETTLED");
  trade.currentStatus = updatedTrade.currentStatus;

  return {
    message: "Break resolved",
    tradeId: trade.id,
    selectedCause: selectedCause,
    actualCause: actualCause,
    correct: correct,
    nextStatus: "RECON_PENDING"
  };

}


// ---------------------------------
// Export Engine
// ---------------------------------

module.exports = {
  investigateBreak,
  resolveBreak
};