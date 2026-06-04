const TRANSITIONS = require("./transitions");
const { InvalidTransitionError } = require("./errors");

class LifecycleEngine {
  static getAllowedTransitions(currentStatus) {
    return TRANSITIONS[currentStatus] || [];
  }

  static canTransition(from, to) {
    const allowed = this.getAllowedTransitions(from);
    return allowed.includes(to);
  }

  static transition(trade, toStatus) {
    const fromStatus = trade.currentStatus;

    if (!this.canTransition(fromStatus, toStatus)) {
      throw new InvalidTransitionError(fromStatus, toStatus);
    }

    return {
      ...trade,
      currentStatus: toStatus
    };
  }
}

module.exports = LifecycleEngine;