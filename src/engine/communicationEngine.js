const aiParser = require("./aiParser");
const cptyAI = require("./cptyAI");
const amendmentEngine = require("./amendmentEngine");

const pendingReplies = [];

function scheduleReply(tradeRef, subject, body) {

  pendingReplies.push({
    tradeRef,
    subject,
    body,
    sendAt: Date.now() + 3000
  });

}

function processReplies(conversationEngine, getTradeByRef) {

  const now = Date.now();

  for (let i = pendingReplies.length - 1; i >= 0; i--) {

    const reply = pendingReplies[i];

    if (now >= reply.sendAt) {

      const parsed = aiParser.parseEmail(reply.body);
      const aiResponse = cptyAI.generateResponse(parsed, reply.tradeRef);

      const trade = getTradeByRef(reply.tradeRef);

      if (trade) {
        trade.cptyResponseReceived = true;

        const amendments = amendmentEngine.extractAmendments(
          aiResponse.body,
          trade
        );

        amendmentEngine.attachAmendments(trade, amendments);
      }

      conversationEngine.createMessage(
        reply.tradeRef,
        "COUNTERPARTY",
        aiResponse.body,
        aiResponse.subject
      );

      pendingReplies.splice(i, 1);
    }
  }
}

module.exports = {
  scheduleReply,
  processReplies
};