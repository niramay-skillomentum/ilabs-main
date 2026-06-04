const { v4: uuidv4 } = require("uuid");

const reconciliationEngine = require("./reconciliation");

// ===============================
// INVESTIGATE BREAK
// ===============================

function investigateBreak() {

  const unmatched = reconciliationEngine.getUnmatched();

  return {
    ledgerUnmatched: unmatched.ledgerUnmatched,
    statementUnmatched: unmatched.statementUnmatched
  };

}


// ===============================
// MANUAL MATCH
// ===============================

function manualMatch(ledgerId, statementId) {

  const ledger = reconciliationEngine.ledger.find(
    l => l.id === ledgerId
  );

  const statement = reconciliationEngine.statements.find(
    s => s.id === statementId
  );

  if (!ledger || !statement) {
    return {
      success: false,
      message: "Ledger or Statement not found"
    };
  }

  if (ledger.matched || statement.matched) {
    return {
      success: false,
      message: "Entry already matched"
    };
  }

  ledger.matched = true;
  statement.matched = true;

  const matchRecord = {
    id: uuidv4(),
    ledgerId,
    statementId,
    matchedBy: "USER",
    matchedAt: new Date()
  };

  reconciliationEngine.matches.push(matchRecord);

  return {
    success: true,
    match: matchRecord
  };

}


// ===============================
// FORCE MATCH (Override)
// ===============================

function forceMatch(ledgerId, statementId) {

  const ledger = reconciliationEngine.ledger.find(
    l => l.id === ledgerId
  );

  const statement = reconciliationEngine.statements.find(
    s => s.id === statementId
  );

  if (!ledger || !statement) {
    return {
      success: false,
      message: "Ledger or Statement not found"
    };
  }

  ledger.matched = true;
  statement.matched = true;

  const matchRecord = {
    id: uuidv4(),
    ledgerId,
    statementId,
    matchedBy: "USER_FORCE",
    matchedAt: new Date()
  };

  reconciliationEngine.matches.push(matchRecord);

  return {
    success: true,
    match: matchRecord
  };

}


// ===============================
// MARK UNMATCHED BY USER
// ===============================

function markUnmatched(entryId) {

  const ledger = reconciliationEngine.ledger.find(
    l => l.id === entryId
  );

  if (ledger) {

    ledger.userMarkedUnmatched = true;

    return {
      success: true,
      message: "Ledger marked unmatched by user"
    };
  }

  const statement = reconciliationEngine.statements.find(
    s => s.id === entryId
  );

  if (statement) {

    statement.userMarkedUnmatched = true;

    return {
      success: true,
      message: "Statement marked unmatched by user"
    };
  }

  return {
    success: false,
    message: "Entry not found"
  };

}


// ===============================
// CLOSE BREAK
// ===============================

function closeBreak() {

  const unmatched = reconciliationEngine.getUnmatched();

  if (
    unmatched.ledgerUnmatched.length === 0 &&
    unmatched.statementUnmatched.length === 0
  ) {

    return {
      success: true,
      message: "Reconciliation Completed"
    };

  }

  return {
    success: false,
    message: "Unmatched entries still exist",
    unmatched
  };

}


module.exports = {

  investigateBreak,
  manualMatch,
  forceMatch,
  markUnmatched,
  closeBreak

};