class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`Invalid lifecycle transition from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

module.exports = {
  InvalidTransitionError
};