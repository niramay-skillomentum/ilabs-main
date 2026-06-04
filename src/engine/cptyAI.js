const truthEngine = require("./truthEngine");

// ======================================
// CONVERSATION STATE (IN-MEMORY)
// ======================================
const conversationState = {};

function getState(tradeRef) {
  if (!conversationState[tradeRef]) {
    conversationState[tradeRef] = {
      attempts: 0,
      isClosed: false
    };
  }
  return conversationState[tradeRef];
}

function generateResponse(parsedIntent, tradeRef) {

  // 🎯 Tone variation (kept minimal for realism)
  const openings = ["Dear Team,", "Hello,", "Hi,"];
  const closings = [
    "Regards, Counterparty Operations",
    "Best regards",
    "Thanks",
    "Kind regards"
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  let body = "";

  // ======================================
  // GLOBAL STATE CHECK
  // ======================================
  const state = getState(tradeRef);

  // 🔴 Global ghost check
  if (state.isClosed) {
    return null;
  }

  // ======================================
  // FORCE REFERENCE VALIDATION (NEW)
  // ======================================
  if (parsedIntent.reference) {

    const referenceCheck = truthEngine.verifyReference(
      tradeRef,
      parsedIntent.reference
    );

    if (!referenceCheck || !referenceCheck.correct) {

      state.attempts += 1;

      if (state.attempts === 1) {
        body = `
We are unable to validate the reference provided.

Kindly recheck and resend the correct details.
`;
      }
      else if (state.attempts === 2) {
        body = `
We are still unable to validate the reference.

Please ensure the correct trade reference is shared.
`;
      }
      else if (state.attempts === 3) {
        body = `
We are unable to proceed without a valid trade reference.

Kindly verify and revert.
`;
      }
      else {
        state.isClosed = true;
        return null;
      }

      return {
        subject: "RE: Trade Inquiry",
        body: `${pick(openings)}

${body.trim()}

${pick(closings)}`
      };
    }

    // ✅ VALID REFERENCE → RESET STATE
    state.attempts = 0;
    state.isClosed = false;
  }

  // ======================================
  // BUSINESS LOGIC (DETERMINISTIC CORE)
  // ======================================

  switch (parsedIntent.intent) {

    // ==============================
    // PAYMENT STATUS
    // ==============================
    case "PAYMENT_STATUS_QUERY": {

      const payment = truthEngine.checkPaymentReceived(tradeRef);

      if (!payment) {

        body = `
We are unable to confirm payment status at the moment.

Please recheck and revert.
`;

      } else if (payment.paymentReceived) {

        body = `
Funds have been received successfully for the trade.

No pending issues from our side.
`;

      } else {

        body = `
Funds have not yet been received for this trade.

Please confirm status from your side.
`;

      }

      break;
    }

    // ==============================
    // SSI
    // ==============================
    case "SSI_QUERY": {

      const ssiCheck = truthEngine.verifySSI(tradeRef);

      if (!ssiCheck) {

        body = `
Unable to validate SSI details at the moment.

Please recheck and revert.
`;

      } else if (ssiCheck.correct) {

        body = `
SSI details appear correct as per our records.

Please reconfirm from your end.
`;

      } else {

        body = `
The SSI used does not match our records.

Please update SSI before reprocessing.
`;

      }

      break;
    }

    // ==============================
    // DEFAULT (MOST IMPORTANT)
    // ==============================
    default: {

      const scenario = truthEngine.getScenario(tradeRef);

      // 🔒 Defensive fallback
      if (!scenario) {

        body = `
We are reviewing your query and will revert shortly.
`;

        break;
      }

      // 🔥 FO TRUTH (DETERMINISTIC)
      const correctAmount = scenario.amount || "N/A";
      const correctVD = scenario.valueDate
        ? new Date(scenario.valueDate).toISOString().split("T")[0]
        : "N/A";

      body = `
Please note the correct trade details as per our records:

Amount: ${correctAmount}
Value Date: ${correctVD}

Kindly update your system accordingly.
`;

      break;
    }
  }

  // ======================================
  // REALISM LAYER (CONTROLLED VARIATION)
  // ======================================

  const finalBody = `${pick(openings)}

${body.trim()}

${pick(closings)}`;

  return {
    subject: "RE: Trade Inquiry",
    body: finalBody
  };
}

module.exports = {
  generateResponse
};