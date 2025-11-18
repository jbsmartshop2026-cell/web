import mongoose from "mongoose";

const timeLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  rfid: {
    type: String,
    required: true
  },

  action: {
    type: String,
    enum: ["start", "end"],
    required: true
  },

  duration: {
    type: Number,
    default: 0
  },

  // IMPORTANT: tracks if this "start" session is already closed
  sessionClosed: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("TimeLog", timeLogSchema);
