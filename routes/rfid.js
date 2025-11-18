import express from "express";
import User from "../models/User.js";

const router = express.Router();

/*
  START:
  { "rfid": "AA BB CC DD", "action": "start" }

  STOP:
  { "rfid": "AA BB CC DD", "action": "stop" }
*/

router.post("/tap", async (req, res) => {
  const { rfid, action } = req.body;

  try {
    const user = await User.findOne({ rfid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (action === "start") {
      return res.json({
        success: true,
        message: "Session started"
      });
    }

    if (action === "stop") {
      return res.json({
        success: true,
        message: "Session stopped"
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid action"
    });

  } catch (err) {
    console.error("RFID TAP ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
