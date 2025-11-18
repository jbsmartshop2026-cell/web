import express from "express";
import User from "../models/User.js";
import TimeLog from "../models/Logs.js";

const router = express.Router();

// MAIN RFID TAP ROUTE
router.post("/tap", async (req, res) => {
  const { rfid, action, duration } = req.body;

  try {
    const user = await User.findOne({ rfid });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // START
    if (action === "start") {
      await new TimeLog({
        userId: user._id,
        rfid,
        action: "start",
      }).save();

      return res.json({ success: true, message: "Session started" });
    }

    // END
    if (action === "end") {
      if (typeof duration !== "number")
        return res.status(400).json({ message: "duration required for end" });

      await new TimeLog({
        userId: user._id,
        rfid,
        action: "end",
        duration,
      }).save();

      return res.json({
        success: true,
        message: "Session ended",
        duration,
      });
    }

    return res.status(400).json({ message: "Invalid action" });

  } catch (err) {
    console.error("TAP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
