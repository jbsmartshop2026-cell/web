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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const logs = await TimeLog.find({ userId })
      .sort({ timestamp: -1 });

    if (!logs || logs.length === 0) {
      return res.json({ message: "No logs found for this user" });
    }

    return res.json(logs);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});





export default router;
