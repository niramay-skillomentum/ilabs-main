require("dotenv").config();
const mongoose = require("mongoose");
const Conversation = require("./src/models/Conversation");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find all conversations that don't have the desks array
  const convs = await Conversation.find({ desks: { $exists: false } });
  
  for (const c of convs) {
    c.desks = ["MO"]; // Defaulting existing ones to MO since sai sent them
    await c.save();
  }
  
  console.log(`Migrated ${convs.length} old conversations to have desks: ["MO"]`);
  process.exit(0);
}
migrate();
