import express from "express";
import TimeLog from "../models/Logs.js";

const router = express.Router();

// GET ALL TIME LOGS
router.get("/allhistory", async (req, res) => {
  try {
    const logs = await TimeLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch time logs" });
  }
});

router.get("/history", async (req, res) => {
  try {
    let { rfid } = req.query;

    if (!rfid) {
      return res.status(400).json({ message: "RFID is required" });
    }

    // Normalize RFID
    rfid = rfid.replace(/\s+/g, "").trim().toUpperCase();

    const logs = await TimeLog.find({ rfid }).sort({ timestamp: -1 });

    if (!logs || logs.length === 0) {
      return res.status(200).json({ message: "No logs found for this RFID" });
    }

    return res.json(logs);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});


export default router;
