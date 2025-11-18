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
    const { rfid } = req.query; // read ?rfid=12345

    let filter = {};

    if (rfid) {
      filter.rfid = rfid; // apply filter ONLY if RFID exists
    }

    const logs = await TimeLog.find(filter).sort({ timestamp: -1 });

    res.json(logs);
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ error: "Failed to fetch time logs" });
  }
});

export default router;
