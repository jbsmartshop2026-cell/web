// models/History.js
import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  userId: String,
  date: Date,        // stored as actual Date
  time: String,      // e.g. "10:22 AM"
  title: String,     // e.g. "Loaded Time"
  amount: String     // e.g. "50 pesos"
});

export default mongoose.model("History", historySchema);
