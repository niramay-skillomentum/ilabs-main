// ======================================
// AMENDMENT ENGINE (V1)
// Extracts suggested trade changes from AI messages
// ======================================

function extractAmendments(message, trade) {

  const amendments = [];

  const text = message.toLowerCase();

  // -----------------------------
  // AMOUNT EXTRACTION
  // -----------------------------
  const amountMatch = text.match(/(\d{5,})/);

  if (amountMatch) {
    const newAmount = parseInt(amountMatch[1]);

    if (!isNaN(newAmount) && newAmount !== trade.amount) {
      amendments.push({
        field: "amount",
        oldValue: trade.amount,
        newValue: newAmount,
        source: "AI",
        status: "PENDING",
        timestamp: Date.now()
      });
    }
  }

  // -----------------------------
  // VALUE DATE EXTRACTION
  // -----------------------------
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);

  if (dateMatch) {
    const newDate = new Date(dateMatch[0]);

    if (newDate.toString() !== "Invalid Date") {
      amendments.push({
        field: "valueDate",
        oldValue: trade.valueDate,
        newValue: newDate,
        source: "AI",
        status: "PENDING",
        timestamp: Date.now()
      });
    }
  }

  return amendments;
}

function attachAmendments(trade, amendments) {

  if (!amendments || amendments.length === 0) return;

  if (!trade.pendingAmendments) {
    trade.pendingAmendments = [];
  }

  trade.pendingAmendments.push(...amendments);
}
function createAmendmentFromInput(trade, field, value) {

  if (!trade || !trade.truth || !trade.booking) return null;

  const expected = trade.truth[field];

  if (expected === value && trade.booking[field] !== value) {

    return {
      field,
      oldValue: trade.booking[field],
      newValue: value,
      source: "USER",
      status: "PENDING",
      timestamp: Date.now()
    };
  }

  return null;
}

module.exports = {
  extractAmendments,
  attachAmendments,
   createAmendmentFromInput
};