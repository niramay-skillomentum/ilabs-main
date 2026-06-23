// ======================================
// FO RESPONSE PROFILES
// Per-counterparty response speed & personality
// ======================================

const PROFILES = {

  CITI: {
    speed: "FAST",
    minDelayMs: 5000,
    maxDelayMs: 10000,
    personality: "COOPERATIVE"
  },

  JPM: {
    speed: "FAST",
    minDelayMs: 5000,
    maxDelayMs: 10000,
    personality: "EFFICIENT"
  },

  HSBC: {
    speed: "MEDIUM",
    minDelayMs: 15000,
    maxDelayMs: 30000,
    personality: "FORMAL"
  },

  BNP: {
    speed: "MEDIUM",
    minDelayMs: 15000,
    maxDelayMs: 30000,
    personality: "CAUTIOUS"
  },

  DB: {
    speed: "SLOW",
    minDelayMs: 45000,
    maxDelayMs: 90000,
    personality: "BUREAUCRATIC"
  }

};

// Default profile for unknown counterparties
const DEFAULT_PROFILE = {
  speed: "MEDIUM",
  minDelayMs: 15000,
  maxDelayMs: 30000,
  personality: "FORMAL"
};

/**
 * Get response profile for a counterparty
 */
function getProfile(counterparty) {
  return PROFILES[counterparty] || DEFAULT_PROFILE;
}

/**
 * Calculate a random delay within the profile's range
 */
function getDelay(counterparty) {

  const profile = getProfile(counterparty);

  const range = profile.maxDelayMs - profile.minDelayMs;

  return profile.minDelayMs + Math.floor(Math.random() * range);

}

module.exports = {
  PROFILES,
  DEFAULT_PROFILE,
  getProfile,
  getDelay
};
