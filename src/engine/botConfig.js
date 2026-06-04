let botConfig = {
  enabled: true,
  movementPercent: 50,   // % of eligible trades
  runIntervalMs: 60000   // default 1 min (can simulate 2x/day later)
};

module.exports = {
  getConfig: () => botConfig,

  updateConfig: (newConfig) => {
    botConfig = { ...botConfig, ...newConfig };
  }
};