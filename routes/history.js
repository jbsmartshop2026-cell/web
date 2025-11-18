import express from "express";
import History from "../models/History.js";
import TimeLog from "../models/Logs.js";

const router = express.Router();

router.get("/history", async (req, res) => {
  try {
    // FETCH PAYMENTS
    const payments = await History.find().lean();
    const paymentItems = payments.map(item => ({
      type: "payment",
      date: item.date,
      title: item.title,
      amount: item.amount,
      time: item.time
    }));

    // FETCH TIME LOGS
    const logs = await TimeLog.find().lean();
    const logItems = logs.map(log => ({
      type: "timelog",
      date: log.createdAt,
      title:
        log.action === "start"
          ? "Session Started"
          : `Session Ended — ${log.duration} mins`,
      amount: null,
      time: new Date(log.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    // MERGE + SORT LATEST → OLDEST
    const finalHistory = [...paymentItems, ...logItems].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.json({ history: finalHistory });
    
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
