import express from "express";
import User from "../models/User.js";

const router = express.Router();

/*
  Expected body:

  START:
  {
    "rfid": "AA BB CC DD",
    "action": "start"
  }

  STOP:
  {
    "rfid": "AA BB CC DD",
    "action": "stop",
    "remainingSeconds": 1234
  }
*/

router.post("/tap", async (req, res) => {
  const { rfid, action, remainingSeconds } = req.body;

  try {
    const user = await User.findOne({ rfid });
    if (!user) return res.status(404).json({ message: "User not found" });

    // -----------------------------
    // 1. START SESSION
    // -----------------------------
    if (action === "start") {
      return res.json({
        success: true,
        message: "Session started",
        remainingSeconds: user.timeCredits
      });
    }

    // -----------------------------
    // 2. STOP SESSION
    // -----------------------------
    if (action === "stop") {
      if (remainingSeconds == null)
        return res.status(400).json({ message: "remainingSeconds required for stop" });

      // save the remaining seconds
      user.timeCredits = remainingSeconds;
      await user.save();

      return res.json({
        success: true,
        message: "Session stopped and saved",
        remainingSeconds
      });
    }

    // -----------------------------
    // INVALID ACTION
    // -----------------------------
    return res.status(400).json({ message: "Invalid action" });

  } catch (err) {
    console.error("RFID TAP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
