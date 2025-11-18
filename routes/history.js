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

router.get("/history/:rfid", async (req, res) => {
  try {
    const rfid = req.params.rfid.trim().toUpperCase();

    const logs = await TimeLog.find({ rfid }).sort({ timestamp: -1 });

    return res.json(logs);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});


export default router;
