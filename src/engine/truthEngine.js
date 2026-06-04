// ======================================
// TRUTH ENGINE
// Verifies user claims against scenario truth
// ======================================

let scenarioStore = [];


/**
 * Load scenarios from scenarioEngine
 */
function loadScenarios(scenarios) {
  scenarioStore = scenarios;
}


/**
 * Get scenario by tradeRef
 */
function getScenario(tradeRef) {

  return scenarioStore.find(
    s => s.tradeRef === tradeRef
  );

}


/**
 * Verify reference
 */
function verifyReference(tradeRef, reference) {

  const scenario = getScenario(tradeRef);

  if (!scenario) return null;

  if (scenario.breakType === "REFERENCE_MISMATCH") {

    return {
      correct: false,
      correctReference: "REF99881"
    };

  }

  return {
    correct: true,
    correctReference: reference
  };

}


/**
 * Verify payment status
 */
function checkPaymentReceived(tradeRef) {

  const scenario = getScenario(tradeRef);

  if (!scenario) return null;

  if (scenario.breakType === "PAYMENT_NOT_RECEIVED") {

    return {
      paymentReceived: false
    };

  }

  return {
    paymentReceived: true
  };

}


/**
 * Verify SSI
 */
function verifySSI(tradeRef) {

  const scenario = getScenario(tradeRef);

  if (!scenario) return null;

  if (scenario.breakType === "SSI_MISMATCH") {

    return {
      correct: false,
      correctSSI: "CITIUS33XXX"
    };

  }

  return {
    correct: true
  };

}

function getTruth(tradeRef) {

  const referenceCheck = verifyReference(tradeRef);
  const payment = checkPaymentReceived(tradeRef);
  const ssi = verifySSI(tradeRef);

  return {
    tradeRef,
    reference: referenceCheck.correctReference,
    paymentReceived: payment.paymentReceived,
    ssiCorrect: ssi.correct
  };
}

function getMismatchFields(trade) {

  if (!trade || !trade.truth || !trade.booking) {
    return [];
  }

  const mismatches = [];

  if (trade.truth.amount !== trade.booking.amount) {
    mismatches.push("amount");
  }

  if (trade.truth.valueDate && trade.booking.valueDate &&
      trade.truth.valueDate !== trade.booking.valueDate) {
    mismatches.push("valueDate");
  }

  return mismatches;
  
 }

module.exports = {
  verifyReference,
  checkPaymentReceived,
  verifySSI,
  getTruth,
  getScenario,
   getMismatchFields
};