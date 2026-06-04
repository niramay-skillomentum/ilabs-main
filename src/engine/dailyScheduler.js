const boxPool = require("./boxPool");

class DailyScheduler {

  runDailyCycle() {

    console.log("Running Daily Cycle...");

    boxPool.evaluateTrades();

    console.log("Daily evaluation complete");

  }

}

module.exports = new DailyScheduler();