import express from "express";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* ============================================================
   GET ALL TRANSACTIONS (admin use)
============================================================ */
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error("Transaction Fetch Error:", err);
    res.status(500).json({ error: "Failed to get transactions" });
  }
});

/* ============================================================
   GET TRANSACTIONS OF SPECIFIC USER
   /api/transactions/user/:id
============================================================ */
router.get("/user/:id", async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.id })
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (err) {
    console.error("User Transaction Error:", err);
    res.status(500).json({ error: "Failed to get user transactions" });
  }
});

export default router;
