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
      return res.status(400).json({ error: "RFID is required" });
    }

    const normalized = rfid.replace(/\s+/g, "").toUpperCase();

    const logs = await TimeLog.aggregate([
      {
        $addFields: {
          normalizedRFID: {
            $cond: [
              { $isArray: "$rfid" },   // If RFID is array: join + normalize
              {
                $replaceAll: {
                  input: { $reduce: {
                    input: "$rfid",
                    initialValue: "",
                    in: { $concat: ["$$value", "$$this"] }
                  }},
                  find: " ",
                  replacement: ""
                }
              },
              {
                // If RFID is string normalize it
                $replaceAll: { input: "$rfid", find: " ", replacement: "" }
              }
            ]
          }
        }
      },
      { $match: { normalizedRFID: normalized } },
      { $sort: { timestamp: -1 } }
    ]);

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
