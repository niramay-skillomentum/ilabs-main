class DeskQueue {
  constructor(deskName) {
    this.deskName = deskName;
    this.mainQueue = [];   // FIFO normal trades
    this.breakQueue = [];  // FIFO break trades
  }

  // Add trade to normal FIFO queue
  addTrade(trade) {
    this.mainQueue.push(trade);
  }

  // Move trade to break queue
  moveToBreak(tradeRef) {
    const index = this.mainQueue.findIndex(t => t.tradeRef === tradeRef);

    if (index === -1) {
      return false;
    }

    const [trade] = this.mainQueue.splice(index, 1);
    this.breakQueue.push(trade);

    return true;
  }

  // Get next trade (FIFO)
  getNextTrade() {
    if (this.mainQueue.length === 0) {
      return null;
    }

    return this.mainQueue.shift();
  }

  // View current state
  viewQueue() {
    return {
      desk: this.deskName,
      mainQueueLength: this.mainQueue.length,
      breakQueueLength: this.breakQueue.length,
      mainQueue: this.mainQueue,
      breakQueue: this.breakQueue
    };
  }
}

module.exports = DeskQueue;