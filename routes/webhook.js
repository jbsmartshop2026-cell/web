const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const User = require("../models/User"); // IMPORTANT: import your User model

router.post("/paymongo", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const signature = req.headers["paymongo-signature"];
    const rawBody = req.body.toString();
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

    // Validate signature
    const computed = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (computed !== signature) {
      console.log("❌ Webhook signature mismatch");
      return res.status(400).send("Invalid signature");
    }

    const data = JSON.parse(rawBody);

    // Check if payment is successful
    if (data.data.attributes.type === "payment.paid") {
      const metadata = data.data.attributes.data.attributes.metadata;

      const rfid = metadata.rfid;
      const hoursAdded = Number(metadata.hours);

      console.log("✅ Payment success webhook received");
      console.log("RFID:", rfid);
      console.log("Hours Purchased:", hoursAdded);

      // -------- FIND USER BY RFID --------
      const user = await User.findOne({ rfid });

      if (!user) {
        console.log("❌ No user found with RFID:", rfid);
        return res.sendStatus(200);
      }

      // -------- ADD HOURS TO EXISTING TIMECREDIT --------
      const [h, m, s] = user.timeCredit.split(":").map(Number);
      let totalSeconds = h * 3600 + m * 60 + s;

      totalSeconds += hoursAdded * 3600;

      const newH = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
      const newM = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
      const newS = String(totalSeconds % 60).padStart(2, "0");

      user.timeCredit = `${newH}:${newM}:${newS}`;
      await user.save();

      console.log("⏳ Updated TimeCredit:", user.timeCredit);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
