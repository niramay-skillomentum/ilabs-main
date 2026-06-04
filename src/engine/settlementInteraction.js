const simulationClock = require("./clock")
const cutoffEngine = require("./cutoff")

// -------------------------------------
// Response Types
// -------------------------------------

const RESPONSE_TYPES = [
  "MATCHED",
  "DISCREPANCY",
  "NO_RESPONSE"
]

// -------------------------------------
// Discrepancy Distribution
// -------------------------------------

const DISCREPANCY_DISTRIBUTION = [
  { type: "AMOUNT_MISMATCH", weight: 35 },
  { type: "SSI_MISMATCH", weight: 25 },
  { type: "REFERENCE_MISMATCH", weight: 15 },
  { type: "OTHER", weight: 25 }
]


// -------------------------------------
// Weighted Random Helper
// -------------------------------------

function weightedRandom(distribution) {

  const total = distribution.reduce((sum, item) => sum + item.weight, 0)

  const rand = Math.random() * total

  let cumulative = 0

  for (const item of distribution) {

    cumulative += item.weight

    if (rand <= cumulative) {
      return item.type
    }

  }

  return distribution[0].type

}


// -------------------------------------
// Schedule Counterparty Response
// -------------------------------------

function scheduleResponse(trade) {

  if (trade.aiResponseScheduledAt) {
    return
  }

  const now = simulationClock.getTime()

  const cutoffMinutes = cutoffEngine.getCutoffMinutes(trade.currency)

  const currentMinutes =
    now.getUTCHours() * 60 + now.getUTCMinutes()

  const minutesToCutoff = cutoffMinutes - currentMinutes

  let delayMinutes


  if (minutesToCutoff > 180) {

    delayMinutes = 60 + Math.floor(Math.random() * 60)

  }
  else if (minutesToCutoff > 60) {

    delayMinutes = 30 + Math.floor(Math.random() * 45)

  }
  else if (minutesToCutoff > 15) {

    delayMinutes = 10 + Math.floor(Math.random() * 20)

  }
  else {

    delayMinutes = 2 + Math.floor(Math.random() * 8)

  }

  trade.aiResponseScheduledAt =
    new Date(now.getTime() + delayMinutes * 60000)

  const response =
    RESPONSE_TYPES[Math.floor(Math.random() * RESPONSE_TYPES.length)]

  trade.aiResponseType = response

  if (response === "DISCREPANCY") {

    trade.actualDiscrepancyReason =
      weightedRandom(DISCREPANCY_DISTRIBUTION)

  }

}


// -------------------------------------
// Refresh Counterparty Status
// -------------------------------------

function refreshStatus(trade) {

  if (!trade) {
    throw new Error("Trade not provided")
  }

  scheduleResponse(trade)

  const now = simulationClock.getTime()

  if (trade.cptyStatus === "MATCHED" ||
      trade.cptyStatus === "DISCREPANCY" ||
      trade.cptyStatus === "NO_RESPONSE") {

    return {
      status: trade.cptyStatus,
      nextUpdate: trade.aiResponseScheduledAt
    }

  }

  if (now >= new Date(trade.aiResponseScheduledAt)) {

    trade.cptyStatus = trade.aiResponseType

  }
  else {

    trade.cptyStatus = "PENDING_CPTY_ACTION"

  }

  return {
    status: trade.cptyStatus,
    nextUpdate: trade.aiResponseScheduledAt
  }

}


// -------------------------------------
// Send Email
// -------------------------------------

function sendEmail(trade) {

  if (!trade.emailSentCount) {
    trade.emailSentCount = 0
  }

  trade.emailSentCount += 1

  return {
    message: "Email sent to counterparty",
    emailCount: trade.emailSentCount
  }

}


// -------------------------------------
// Send Chaser
// -------------------------------------

function sendChaser(trade) {

  if (!trade.chaserCount) {
    trade.chaserCount = 0
  }

  trade.chaserCount += 1

  return {
    message: "Chaser sent to counterparty",
    chaserCount: trade.chaserCount
  }

}


// -------------------------------------
// Exclude Trade
// -------------------------------------

function excludeTrade(trade) {

  trade.excludedByUser = true

  return {
    message: "Trade excluded from today's settlement"
  }

}


// -------------------------------------
// EXPORT ENGINE
// -------------------------------------

module.exports = {
  refreshStatus,
  sendEmail,
  sendChaser,
  excludeTrade
}