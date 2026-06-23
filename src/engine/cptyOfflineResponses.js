// ======================================
// CPTY OFFLINE RESPONSES
// Templates for Counterparty Replies
// Organized by Intent -> Tone -> Variations
// ======================================

module.exports = {
  GREETING: {
    COOPERATIVE: [
      "Hi SGB Team! Thanks for reaching out. We have Trade {{tradeRef}} open. What do you need?",
      "Hello! Let us know what you need regarding {{tradeRef}} and we'll check our systems.",
      "Hi there! Happy to assist with Trade {{tradeRef}}."
    ],
    EFFICIENT: [
      "Hi. What is the query regarding {{tradeRef}}?",
      "Hello. Please specify your request for {{tradeRef}}.",
      "Checking {{tradeRef}}. What do you need?"
    ],
    FORMAL: [
      "Dear SGB Operations, we acknowledge your message regarding Trade {{tradeRef}}. Please advise on the nature of your inquiry.",
      "Good day. How may we assist with Trade {{tradeRef}} today?",
      "Greetings. We are reviewing {{tradeRef}}. Kindly specify the details you would like us to check."
    ],
    CAUTIOUS: [
      "Hi. We see your message regarding {{tradeRef}}. Could you provide more detail on what you're looking for?",
      "Hello. Before we proceed with {{tradeRef}}, please confirm exactly what needs to be checked.",
      "Greetings. Can you clarify your request regarding {{tradeRef}}?"
    ]
  },

  THANKS: {
    COOPERATIVE: [
      "You're welcome! Let us know if anything else is needed.",
      "No problem! Have a good day."
    ],
    EFFICIENT: [
      "Noted. Thanks.",
      "Understood."
    ],
    FORMAL: [
      "Thank you. We acknowledge receipt.",
      "Noted with thanks."
    ],
    CAUTIOUS: [
      "Received, thank you. Please let us know if anything changes.",
      "Acknowledged."
    ]
  },

  ERROR_CHECK_WITH_ISSUES: {
    COOPERATIVE: [
      "We've checked our records for Trade {{tradeRef}} and noticed a discrepancy:\n\n{{issueList}}\n\nPlease update your booking.",
      "Thanks for asking. It looks like there is an issue:\n\n{{issueList}}\n\nCan you amend this?"
    ],
    EFFICIENT: [
      "Review complete for {{tradeRef}}. Discrepancies found:\n\n{{issueList}}\n\nPlease amend.",
      "Checked. Issues identified:\n\n{{issueList}}\n\nAction required."
    ],
    FORMAL: [
      "We have conducted a review of Trade {{tradeRef}} and identified the following discrepancies:\n\n{{issueList}}\n\nWe kindly request that you process the necessary amendments.",
      "Our investigation into Trade {{tradeRef}} reveals the following issues:\n\n{{issueList}}\n\nKindly action the required corrections."
    ],
    CAUTIOUS: [
      "We've looked into Trade {{tradeRef}} and it seems there might be a discrepancy:\n\n{{issueList}}\n\nCould you verify this?",
      "We've identified potential issues:\n\n{{issueList}}\n\nPlease investigate from your side."
    ]
  },

  ERROR_CHECK_NO_ISSUES: {
    COOPERATIVE: [
      "We checked Trade {{tradeRef}} and everything looks correct on our end. No discrepancies found.",
      "All good from our side for {{tradeRef}}. Our records match."
    ],
    EFFICIENT: [
      "Trade {{tradeRef}} verified. No issues found.",
      "Checked. Details match."
    ],
    FORMAL: [
      "We have reviewed Trade {{tradeRef}} and confirm that all details are consistent with our records.",
      "We find no discrepancies with Trade {{tradeRef}}."
    ],
    CAUTIOUS: [
      "We've reviewed Trade {{tradeRef}} and didn't spot any obvious issues on our end.",
      "Based on our current records, Trade {{tradeRef}} appears to be correct."
    ]
  },

  PAYMENT_RECEIVED: {
    COOPERATIVE: [
      "Good news — funds have been received successfully for Trade {{tradeRef}}. No pending issues on our end.",
      "Confirming we have received payment for this trade. We're all set here.",
      "Just checked and we see the funds for {{tradeRef}}. Thanks!",
      "Payment is confirmed on our side. Everything is settled."
    ],
    EFFICIENT: [
      "Payment received for {{tradeRef}}.",
      "Funds confirmed.",
      "Settlement complete on our end.",
      "Receipt of funds confirmed."
    ],
    FORMAL: [
      "We confirm that funds have been successfully received for Trade {{tradeRef}}.",
      "Please be advised that payment has been credited to our account for this transaction.",
      "We acknowledge receipt of the settlement funds.",
      "Confirmation of payment received."
    ],
    CAUTIOUS: [
      "We currently see the funds in our account for Trade {{tradeRef}}.",
      "It appears payment has been received on our end.",
      "Our records indicate the funds have settled.",
      "We believe settlement is complete on our side."
    ]
  },

  PAYMENT_NOT_RECEIVED: {
    COOPERATIVE: [
      "We haven't received funds yet for Trade {{tradeRef}}. Could you check the status from your side?",
      "Still waiting on the payment for this one. Can you provide an update?",
      "We do not see the funds in our account yet. Could you investigate?",
      "No payment received on our end so far. Let us know when it's sent."
    ],
    EFFICIENT: [
      "Funds not received for {{tradeRef}}. Please advise.",
      "Payment pending. Check status.",
      "No receipt of funds. Investigate.",
      "Awaiting settlement."
    ],
    FORMAL: [
      "We wish to advise that funds have not yet been received for Trade {{tradeRef}}.",
      "Please note that our account has not been credited for this transaction. Kindly investigate.",
      "We await receipt of settlement funds.",
      "Payment remains outstanding on our records."
    ],
    CAUTIOUS: [
      "We don't seem to have received the funds yet. Could you verify if they were sent?",
      "It appears the payment is still pending. Can you check your side?",
      "We are currently unable to confirm receipt of funds.",
      "We have not located the payment in our account."
    ]
  },

  SSI_CORRECT: {
    COOPERATIVE: [
      "SSI details appear correct as per our records. Please reconfirm from your end.",
      "The settlement instructions match what we have on file. We're good to go.",
      "Checked the SSIs and they are correct."
    ],
    EFFICIENT: [
      "SSI details correct.",
      "SSIs match.",
      "Instructions verified."
    ],
    FORMAL: [
      "We confirm the settlement instructions are correct as per our records.",
      "The SSI details provided align with our internal data.",
      "Instructions have been successfully validated."
    ],
    CAUTIOUS: [
      "The SSIs seem to match our records.",
      "We believe the settlement instructions are accurate.",
      "Instructions appear correct on our side."
    ]
  },

  SSI_MISMATCH: {
    COOPERATIVE: [
      "The SSI used does not match our records. Please update to {{correctSSI}} before reprocessing.",
      "Looks like the wrong settlement instructions were used. It should be {{correctSSI}}.",
      "There is an SSI mismatch. Please use {{correctSSI}}.",
      "Could you please update the SSI to {{correctSSI}}?"
    ],
    EFFICIENT: [
      "SSI mismatch. Use {{correctSSI}}.",
      "Incorrect SSI. Update to {{correctSSI}}.",
      "Amend SSI to {{correctSSI}}.",
      "Wrong instructions. Correct SSI: {{correctSSI}}."
    ],
    FORMAL: [
      "Please be advised that the SSI used is incorrect. Kindly update your records to reflect {{correctSSI}}.",
      "We request an amendment to the settlement instructions. The correct SSI is {{correctSSI}}.",
      "The instructions provided do not match our records. Please utilize {{correctSSI}}.",
      "Formal notification of SSI discrepancy. The authorized SSI is {{correctSSI}}."
    ],
    CAUTIOUS: [
      "It appears there might be an issue with the SSI. We expect {{correctSSI}}.",
      "Could you verify the settlement instructions? Our records indicate {{correctSSI}}.",
      "We see a potential mismatch with the SSI. Please check against {{correctSSI}}.",
      "The SSI may need to be updated to {{correctSSI}}."
    ]
  },

  REFERENCE_INCORRECT: {
    COOPERATIVE: [
      "We are unable to validate the reference provided. Kindly recheck and resend the correct details.",
      "The trade reference doesn't seem to match our records. Can you double check?",
      "We can't find that reference in our system. Could it be different?",
      "Please verify the trade reference, as we are unable to locate it."
    ],
    EFFICIENT: [
      "Reference invalid. Please check.",
      "Cannot validate reference.",
      "Unknown reference. Re-verify.",
      "Trade not found with given reference."
    ],
    FORMAL: [
      "We are unable to validate the reference provided. Please ensure the correct trade details are shared.",
      "The trade reference is not recognized in our systems. Kindly verify.",
      "We cannot proceed as the reference is invalid.",
      "Please review the reference provided as it does not match our records."
    ],
    CAUTIOUS: [
      "We're having trouble locating that reference. Could you confirm it?",
      "It seems the reference might be incorrect. Can you check?",
      "We don't see that reference in our system currently.",
      "The reference provided might not be accurate. Please verify."
    ]
  },

  GENERAL_INQUIRY: {
    COOPERATIVE: [
      "Please note the correct trade details as per our records:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}\n\nKindly update your system accordingly.",
      "Here are the details we have on our side:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}\n\nLet us know if you need anything else.",
      "Confirming our trade details for {{tradeRef}}:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}.",
      "As requested, our records show:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}.",
      "Details for {{tradeRef}}:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}."
    ],
    EFFICIENT: [
      "Trade details:\nAmount: {{truthAmount}}\nVD: {{truthVD}}",
      "Records show:\nAmount: {{truthAmount}}\nVD: {{truthVD}}",
      "Amount: {{truthAmount}}\nVD: {{truthVD}}",
      "Confirmed details:\nAmount: {{truthAmount}}\nVD: {{truthVD}}",
      "Our system:\nAmount: {{truthAmount}}\nVD: {{truthVD}}"
    ],
    FORMAL: [
      "Please be advised of the trade details as per our records:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "We confirm the following parameters for Trade {{tradeRef}}:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "Our records indicate the following:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "Formal confirmation of trade details:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "The authorized trade details are:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}"
    ],
    CAUTIOUS: [
      "Based on our records, the details appear to be:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "We currently show the following for this trade:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "It looks like our details are:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "We believe the correct parameters are:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}",
      "Our system reflects the following:\n\nAmount: {{truthAmount}}\nValue Date: {{truthVD}}"
    ]
  },
  
  CONFIRMATION: {
    COOPERATIVE: [
      "We have reviewed the details for Trade {{tradeRef}} and confirm everything matches our records. Good to go!",
      "Confirmed. The trade details match our side perfectly.",
      "We affirm Trade {{tradeRef}}. No discrepancies noted."
    ],
    EFFICIENT: [
      "Confirmed.",
      "Trade affirmed.",
      "Details verified. Confirmed."
    ],
    FORMAL: [
      "We hereby confirm Trade {{tradeRef}}. All parameters match our records.",
      "Formal affirmation of Trade {{tradeRef}} is provided.",
      "We acknowledge and confirm the details of this transaction."
    ],
    CAUTIOUS: [
      "We believe the details match our records and are ready to confirm.",
      "Everything appears correct on our end. We confirm the trade.",
      "We see no issues and can confirm the trade parameters."
    ]
  },

  CPTY_STAYS_FIRM: {
    COOPERATIVE: [
      "We escalated this internally, but our desk is absolutely firm on our numbers:\n\n{{issueList}}\n\nWe cannot confirm your values.",
    ],
    EFFICIENT: [
      "Re-checked. Our numbers stand:\n\n{{issueList}}\n\nAmend your side.",
    ],
    FORMAL: [
      "Following a secondary review with our trading desk, we stand firm on our records. The discrepancies remain:\n\n{{issueList}}\n\nPlease amend your booking.",
    ],
    CAUTIOUS: [
      "We have double-checked this again, and we are confident in our values:\n\n{{issueList}}\n\nWe cannot proceed until these match.",
    ]
  },

  CPTY_ADMITS_MISTAKE: {
    COOPERATIVE: [
      "Ah, our apologies! We escalated to our desk and checked the universal execution. You are correct. We will amend our side to match your values.",
    ],
    EFFICIENT: [
      "You are correct. Error on our side. We will amend and confirm.",
    ],
    FORMAL: [
      "Upon secondary review against the execution platform, we acknowledge an error in our local booking. Your values are correct. We will amend our records and affirm the trade.",
    ],
    CAUTIOUS: [
      "It appears there was a mistake on our end after all. Your numbers are correct. We are updating our systems now.",
    ]
  },

  CLARIFICATION: {
    COOPERATIVE: [
      "I'm sorry, I didn't quite catch that. Could you clarify what you need regarding Trade {{tradeRef}}?",
      "Could you provide a bit more detail? We want to make sure we're checking the right thing for {{tradeRef}}.",
      "Hi! We received your message about {{tradeRef}}, but we're not exactly sure what you're asking. Can you elaborate?"
    ],
    EFFICIENT: [
      "Please clarify your request for {{tradeRef}}.",
      "Query unclear. Provide more details for {{tradeRef}}.",
      "Specify the exact discrepancy for {{tradeRef}}."
    ],
    FORMAL: [
      "We acknowledge your message regarding Trade {{tradeRef}}. However, the inquiry is unclear. Please provide further clarification.",
      "Kindly elaborate on your request for Trade {{tradeRef}} so we may assist you properly.",
      "We are unable to process your request as stated. Please clarify the issue with Trade {{tradeRef}}."
    ],
    CAUTIOUS: [
      "We received your message, but we need more information before proceeding. What exactly are you querying on {{tradeRef}}?",
      "Could you please clarify your question? We want to be certain before making any adjustments to {{tradeRef}}.",
      "Please provide more context for your request on Trade {{tradeRef}}."
    ]
  }
};
