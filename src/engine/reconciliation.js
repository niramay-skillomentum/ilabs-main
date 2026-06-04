const { v4: uuidv4 } = require("uuid");

// ===============================
// IN-MEMORY DATA STORES
// ===============================

const ledger = [];
const statements = [];
const matches = [];


// ===============================
// RECONCILIATION SCENARIO ENGINE
// ===============================

const SCENARIOS = [
  { type: "PERFECT_MATCH", weight: 40 },
  { type: "REFERENCE_MISMATCH", weight: 20 },
  { type: "AMOUNT_MISMATCH", weight: 15 },
  { type: "MISSING_STATEMENT", weight: 10 },
  { type: "DUPLICATE_LEDGER", weight: 10 },
  { type: "TIMING_DIFFERENCE", weight: 5 }
];

function pickScenario() {

  const totalWeight = SCENARIOS.reduce((sum, s) => sum + s.weight, 0);

  let random = Math.random() * totalWeight;

  for (const scenario of SCENARIOS) {

    if (random < scenario.weight) {
      return scenario.type;
    }

    random -= scenario.weight;

  }

  return "PERFECT_MATCH";
}


// ===============================
// LEDGER GENERATION
// ===============================

function generateLedgerEntry(trade) {

  const scenario = pickScenario();

  const entry = {
    id: uuidv4(),
    tradeId: trade.id,
    currency: trade.currency,
    amount: trade.amount,
    valueDate: trade.valueDate,
    ref1: trade.reference,
    createdAt: new Date(),
    matched: false,
    scenario
  };

  ledger.push(entry);

  // Duplicate ledger scenario
  if (scenario === "DUPLICATE_LEDGER") {

    const duplicate = {
      ...entry,
      id: uuidv4(),
      duplicate: true
    };

    ledger.push(duplicate);

  }

  return entry;

}


// ===============================
// STATEMENT GENERATION
// ===============================

function generateStatement(trade) {

  if (trade.lifecycle !== "SETTLED") {
    return null;
  }

  const scenario = pickScenario();

  if (scenario === "MISSING_STATEMENT") {
    return null;
  }

  let amount = trade.amount;
  let ref = trade.reference;
  let valueDate = trade.actualSettlementDate || trade.valueDate;

  if (scenario === "REFERENCE_MISMATCH") {
    ref = "REF999";
  }

  if (scenario === "AMOUNT_MISMATCH") {
    amount = trade.amount + 500;
  }

  if (scenario === "TIMING_DIFFERENCE") {
    valueDate = new Date(valueDate.getTime() + 86400000);
  }

  const statement = {
    id: uuidv4(),
    tradeId: trade.id,
    currency: trade.currency,
    amount,
    valueDate,
    ref1: ref,
    createdAt: new Date(),
    matched: false,
    scenario
  };

  statements.push(statement);

  return statement;

}


// ===============================
// AUTO MATCH ENGINE
// ===============================

function attemptAutoMatch() {

  ledger.forEach((l) => {

    if (l.matched) return;

    const match = statements.find(
      (s) =>
        !s.matched &&
        s.amount === l.amount &&
        s.currency === l.currency &&
        s.ref1 === l.ref1
    );

    if (match) {

      l.matched = true;
      match.matched = true;

      matches.push({
        id: uuidv4(),
        ledgerId: l.id,
        statementId: match.id,
        matchedAt: new Date(),
        matchedBy: "AUTO"
      });

    }

  });

}


// ===============================
// UNMATCHED DETECTION
// ===============================

function getUnmatched() {

  const ledgerUnmatched = ledger.filter(l => !l.matched);
  const statementUnmatched = statements.filter(s => !s.matched);

  return {
    ledgerUnmatched,
    statementUnmatched
  };

}


// ===============================
// EXPORTS
// ===============================

module.exports = {

  generateLedgerEntry,
  generateStatement,
  attemptAutoMatch,
  getUnmatched,

  ledger,
  statements,
  matches

};