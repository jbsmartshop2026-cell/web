import express from "express";
import User from "../models/User.js";

const router = express.Router();



router.post("/tap", async (req, res) => {
  const { rfid, subtractSeconds = 60 } = req.body;

  try {
    const user = await User.findOne({ rfid });
    if (!user) return res.status(404).send("User not found");

    let [hh, mm, ss] = user.timeCredit.split(":").map(Number);
    let totalSeconds = hh * 3600 + mm * 60 + ss;

    totalSeconds = Math.max(totalSeconds - subtractSeconds, 0);

    const newHH = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const newMM = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const newSS = String(totalSeconds % 60).padStart(2, "0");

    const newTime = `${newHH}:${newMM}:${newSS}`;

    user.timeCredit = newTime;
    await user.save();

    res.json({ timeCredit: newTime, totalSeconds }); // send totalSeconds for easy Flutter conversion
  } catch (err) {
    console.error("RFID TAP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
