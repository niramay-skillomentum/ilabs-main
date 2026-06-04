const simulationClock = require("./clock");
const cutOffEngine = require("./cutoff");
const LifecycleEngine = require("./lifecycle"); // ✅ added

async function approveSettlement(prisma, trade, userId) {

  const operationalTimeET = simulationClock.getOperationalTimeET();

  const simulationDate = new Date(simulationClock.getFormattedTime());
  let valueDate = new Date(trade.valueDate);

  let cutOffBreached = false;
  let valueDateShifted = false;
  let message = "Settlement successful";

  const simDateStr = simulationDate.toISOString().slice(0,10);
  const valueDateStr = valueDate.toISOString().slice(0,10);

  const isValueDate = simDateStr === valueDateStr;

  if (isValueDate) {

    cutOffBreached = cutOffEngine.isCutOffBreached(trade.currency);

    if (cutOffBreached) {

      valueDateShifted = true;

      const nextBusinessDay = new Date(valueDate);
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);

      valueDate = nextBusinessDay;

      message = "Cut-off passed. Settlement will occur next business day.";

    }

  }

  // ✅ FIX: enforce lifecycle path
  const settledTrade = LifecycleEngine.transition(trade, "SETTLED");
  const reconTrade = LifecycleEngine.transition(settledTrade, "RECON_PENDING");

  const updatedTrade = await prisma.trade.update({
    where: { id: trade.id },
    data: {
      valueDate: valueDate,
      cutOffBreached: cutOffBreached,
      settlementApprovedAt: new Date(),
      settlementApprovedBy: userId,
      actualSettlementDate: new Date(),
      currentStatus: reconTrade.currentStatus // ✅ fixed
    }
  });

  return {
    tradeId: updatedTrade.id,
    operationalTimeET,
    cutOffBreached,
    valueDateShifted,
    message
  };

}

module.exports = {
  approveSettlement
};