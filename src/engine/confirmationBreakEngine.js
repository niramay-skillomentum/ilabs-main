// ======================================
// CONFIRMATION BREAK ENGINE
// Detects discrepancies between the trade's current
// economics (after MO amendments) and the counterparty's
// expected economics (truths.confirmation).
// ======================================

const truthEngine = require("./truthEngine");

/**
 * Detect confirmation-level breaks.
 * Compares trade's current economics vs truths.confirmation.
 * @param {Object} trade - The trade object
 * @returns {Object[]} Array of break objects
 */
function detectConfirmationBreaks(trade) {
  return truthEngine.getConfirmationMismatches(trade);
}

/**
 * Check if a trade has any confirmation-level discrepancy.
 * @param {Object} trade
 * @returns {boolean}
 */
function hasConfirmationBreak(trade) {
  return detectConfirmationBreaks(trade).length > 0;
}

/**
 * Get a human-readable description of confirmation breaks.
 * @param {Object} trade
 * @returns {string}
 */
function describeConfirmationBreaks(trade) {
  const breaks = detectConfirmationBreaks(trade);
  if (breaks.length === 0) return "No confirmation discrepancies found.";

  return breaks.map(b => {
    if (b.field === "amount") {
      return `Amount mismatch: Our records show ${trade.currency} ${b.tradeValue}, counterparty expects ${trade.currency} ${b.cptyExpected}`;
    }
    if (b.field === "valueDate") {
      const ourDate = new Date(b.tradeValue).toISOString().split("T")[0];
      const cptyDate = new Date(b.cptyExpected).toISOString().split("T")[0];
      return `Value Date mismatch: Our records show ${ourDate}, counterparty expects ${cptyDate}`;
    }
    if (b.field === "currency") {
      return `Currency mismatch: Our records show ${b.tradeValue}, counterparty expects ${b.cptyExpected}`;
    }
    return `${b.field} mismatch`;
  }).join("; ");
}

module.exports = {
  detectConfirmationBreaks,
  hasConfirmationBreak,
  describeConfirmationBreaks
};
