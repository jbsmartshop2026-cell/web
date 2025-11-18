import express from "express";
import TimeLog from "../models/Logs.js";
const router = express.Router();

router.get("/history", async (req, res) => {
  try {
    const logs = await TimeLog.find().sort({ createdAt: -1 }).lean();

    const logItems = logs.map(log => ({
      type: "timelog",
      action: log.action,
      duration: log.duration ?? 0,
      date: log.createdAt,
      time: new Date(log.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    res.json({ history: logItems });  // 👈 FIXED
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
