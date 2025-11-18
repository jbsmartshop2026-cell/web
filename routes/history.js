// routes/history.js
import express from "express";
import History from "../models/History.js";
const router = express.Router();

router.get("/history", async (req, res) => {
  try {
    const items = await History.find().sort({ date: -1 });

    const formatted = items.map(item => ({
      date: item.date.toISOString().split("T")[0],   // "2025-11-16"
      time: item.time,
      title: item.title,
      amount: item.amount
    }));

    res.json({ history: formatted });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
