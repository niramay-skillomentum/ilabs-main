// ======================================
// AUDIT ENGINE
// Tracks all operational events
// ======================================

const auditLogs = [];


/**
 * Record an audit event
 */
function recordEvent(tradeRef, actor, action, details = "") {

  const event = {
    id: `AUDIT_${Date.now()}`,
    tradeRef,
    actor,
    action,
    details,
    timestamp: new Date()
  };

  auditLogs.push(event);

  return event;

}


/**
 * Get audit history for a trade
 */
function getAuditTrail(tradeRef) {

  return auditLogs.filter(log => log.tradeRef === tradeRef);

}


module.exports = {
  recordEvent,
  getAuditTrail
};