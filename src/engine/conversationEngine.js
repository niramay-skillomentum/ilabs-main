// ======================================
// CONVERSATION ENGINE (FIXED)
// ======================================

const conversations = {}; // ✅ object, not array

/**
 * Create or add message to conversation
 */
function createMessage(tradeRef, sender, body, subject) {

  if (!conversations[tradeRef]) {
    conversations[tradeRef] = {
      subject: subject || `Trade ${tradeRef}`,
      messages: []
    };
  }

  conversations[tradeRef].messages.push({
    sender,
    body,
    timestamp: Date.now()
  });

  return conversations[tradeRef];
}


/**
 * Get full conversation
 */
function getConversation(tradeRef) {

  return conversations[tradeRef] || {
    subject: `Trade ${tradeRef}`,
    messages: []
  };

}


module.exports = {
  createMessage,
  getConversation
};