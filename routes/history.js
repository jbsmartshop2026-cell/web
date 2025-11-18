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
      date: item.date, // <-- keep as real Date
      title: item.title,
      amount: item.amount,
      time: item.time
    }));

    // FETCH TIME LOGS
    const logs = await TimeLog.find().lean();
    const logItems = logs.map(log => {
      const created = new Date(log.createdAt);

      return {
        type: "timelog",
        date: created, // <-- must send pure Date
        title:
          log.action === "start"
            ? "Session Started"
            : `Session Ended — ${Math.round(log.duration / 60)} mins`, // convert seconds → minutes
        amount: null,
        time: created.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        }),
      };
    });

    // MERGE + SORT
    const finalHistory = [...paymentItems, ...logItems].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // FIX: Convert ALL dates to ISO before sending
    const sanitized = finalHistory.map(h => ({
      ...h,
      date: new Date(h.date).toISOString().split("T")[0],
      time: h.time
    }));

    res.json({ history: sanitized });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
