import express from "express";
import User from "../models/User.js";
import TimeLog from "../models/Logs.js";

const router = express.Router();

/*
  ===================================================================
   RFID TAP ROUTE (START / END SESSION)
  ===================================================================
*/
router.post("/tap", async (req, res) => {
  const { rfid, action } = req.body;

  try {
    // Find user by RFID
    const user = await User.findOne({ rfid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /*
      ---------------------------------------------------------------
       START SESSION
      ---------------------------------------------------------------
    */
    if (action === "start") {
      // Create a new start log
      await new TimeLog({
        userId: user._id,
        rfid,
        action: "start",
        timestamp: new Date(),
        sessionClosed: false
      }).save();

      return res.json({
        success: true,
        message: "Session started"
      });
    }

    /*
      ---------------------------------------------------------------
       END SESSION
      ---------------------------------------------------------------
    */
    if (action === "end") {
      // Find last start that is not yet closed
      const lastStart = await TimeLog.findOne({
        rfid,
        action: "start",
        sessionClosed: false
      }).sort({ timestamp: -1 });

      if (!lastStart) {
        return res.status(400).json({ message: "No active session found" });
      }

      const endTime = new Date();
      const durationSeconds = Math.floor(
        (endTime - lastStart.timestamp) / 1000
      );

      // Create END log
      await new TimeLog({
        userId: user._id,
        rfid,
        action: "end",
        duration: durationSeconds,
        timestamp: endTime
      }).save();

      // Mark START as closed
      lastStart.sessionClosed = true;
      await lastStart.save();

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
