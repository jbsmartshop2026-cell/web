import express from "express";
import User from "../models/User.js";
import TimeLog from "../models/Logs.js";

const router = express.Router();

router.post("/tap", async (req, res) => {
  const { rfid, action } = req.body;

  try {
    const user = await User.findOne({ rfid });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ----------------------------------------------------------------------
    // START SESSION
    // ----------------------------------------------------------------------
    if (action === "start") {
      // Check if user already has an active session
      const active = await TimeLog.findOne({
        rfid,
        action: "start",
        sessionClosed: false
      });

      if (active) {
        return res.status(400).json({
          message: "Session already active. Must end before starting again."
        });
      }

      await new TimeLog({
        userId: user._id,
        rfid,
        action: "start",
        sessionClosed: false,
        timestamp: new Date()
      }).save();

      return res.json({ success: true, message: "Session started" });
    }

    // ----------------------------------------------------------------------
    // END SESSION
    // ----------------------------------------------------------------------
    if (action === "end") {
      const lastStart = await TimeLog.findOne({
        rfid,
        action: "start",
        sessionClosed: false
      }).sort({ timestamp: -1 });

      if (!lastStart)
        return res.status(400).json({ message: "No active session found" });

      const endTime = new Date();

      const durationSeconds = Math.floor(
        (endTime.getTime() - lastStart.timestamp.getTime()) / 1000
      );

      if (isNaN(durationSeconds) || durationSeconds < 0) {
        return res.status(500).json({ message: "Duration calculation error" });
      }

      // Close start session
      lastStart.sessionClosed = true;
      await lastStart.save();

      // Save END log
      await new TimeLog({
        userId: user._id,
        rfid,
        action: "end",
        duration: durationSeconds,
        sessionClosed: true,
        timestamp: endTime
      }).save();

      return res.json({
        success: true,
        message: "Session ended",
        duration: durationSeconds
      });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (err) {
    console.error("TAP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
