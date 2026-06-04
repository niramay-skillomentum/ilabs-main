// ======================================
// AI PARSER ENGINE (UPGRADED)
// Deterministic + AI-ready hybrid design
// ======================================

function parseEmail(body) {

  const rawText = body || "";
  const text = rawText.toUpperCase();

  let intent = "GENERAL_QUERY";

  let extractedReference = null;
  let extractedCurrency = null;
  let extractedAmounts = [];
  let extractedDates = [];

  // ======================================
  // EXTRACTION LAYER (CRITICAL)
  // ======================================

  // Detect reference (flexible)
  const refMatch = text.match(/\bTRD_[A-Za-z0-9_]+\b/i);
  if (refMatch) extractedReference = refMatch[0];

  // Detect currency
  const currencyMatch = text.match(/\b(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|SEK|NOK)\b/);
  if (currencyMatch) extractedCurrency = currencyMatch[0];

  // Detect ALL numbers (IMPORTANT CHANGE)
  const numberMatches = text.match(/\b\d{3,}(?:,\d{3})*\b/g);
  if (numberMatches) {
    extractedAmounts = numberMatches.map(n => n.replace(/,/g, ""));
  }

  // Detect simple date patterns
  const dateMatches = text.match(/\b\d{1,2}\s?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/g);
  if (dateMatches) extractedDates = dateMatches;

  // ======================================
  // INTENT DETECTION (PRIORITY-BASED)
  // ======================================

  // 🔥 PRIORITY 1 — DISCREPANCY (MOST IMPORTANT)
  if (extractedAmounts.length >= 2) {
    intent = "DISCREPANCY_QUERY";
  }

  // 🔥 PRIORITY 2 — VALUE DATE CHECK
  else if (text.includes("VALUE DATE") || text.includes("VD") || extractedDates.length > 0) {
    intent = "VALUE_DATE_QUERY";
  }

  // 🔥 PRIORITY 3 — PAYMENT
  else if (text.includes("PAYMENT") || text.includes("FUNDS")) {
    intent = "PAYMENT_STATUS_QUERY";
  }

  // 🔥 PRIORITY 4 — SSI
  else if (text.includes("SSI")) {
    intent = "SSI_QUERY";
  }

  // 🔥 PRIORITY 5 — REFERENCE (LOW PRIORITY NOW)
  else if (text.includes("REFERENCE") || text.includes("REF")) {
    intent = "REFERENCE_QUERY";
  }

  // 🔥 PRIORITY 6 — CONFIRMATION
  else if (text.includes("CONFIRM")) {
    intent = "CONFIRMATION_REQUEST";
  }

  // ======================================
  // RETURN STRUCTURED OUTPUT
  // ======================================

  return {
    intent,
    reference: extractedReference,
    currency: extractedCurrency,
    amounts: extractedAmounts,   // 🔥 multiple values
    dates: extractedDates,
    rawText // 🔥 for fallback logic in cptyAI
  };

}

module.exports = {
  parseEmail
};