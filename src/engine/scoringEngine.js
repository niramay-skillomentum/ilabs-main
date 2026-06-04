// ✅ S2.9.1

const userScores = {};

function evaluateAction(trade, action, issueType, userId){

  if(!userScores[userId]){
    userScores[userId] = 0;
  }

  let scoreDelta = 0;

  if(action.includes("VALIDATE")){
    scoreDelta += 5;
  }

  if(action.includes("RAISE_BREAK")){
    scoreDelta += 3;
  }

  if(issueType){
    scoreDelta += 2;
  }

  userScores[userId] += scoreDelta;

  return {
    scoreDelta,
    total: userScores[userId]
  };
}

module.exports = {
  evaluateAction
};