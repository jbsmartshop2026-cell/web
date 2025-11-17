import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rfid: { type: String, unique: true },
  picture: String,
  timeCredit: { type: String, default: "0:00:00" }, // format HH:MM:SS
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
