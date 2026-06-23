require("dotenv").config();
const mongoose = require("mongoose");
const Conversation = require("./src/models/Conversation");

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const convs = await Conversation.find().lean();
  console.log(JSON.stringify(convs, null, 2));
  process.exit(0);
}
check();
