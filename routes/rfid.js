import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/tap", async (req, res) => {
  const { rfid, subtractSeconds = 60 } = req.body; // default subtract = 60s

  try {
    const user = await User.findOne({ rfid });
    if (!user) return res.status(404).json({ message: "User not found" });

    // timeCredits is NUMBER (seconds)
    let remaining = user.timeCredits;

    // subtract time safely
    remaining = Math.max(remaining - subtractSeconds, 0);

    // save
    user.timeCredits = remaining;
    await user.save();

    res.json({
      success: true,
      remainingSeconds: remaining
    });

  } catch (err) {
    console.error("RFID TAP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
