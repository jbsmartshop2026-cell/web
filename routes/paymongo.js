import express from "express";
import crypto from "crypto";
import axios from "axios";
import User from "../models/User.js";

const router = express.Router();

/* ============================================================
   CREATE CHECKOUT SESSION
   ============================================================ */
router.post("/create-checkout", async (req, res) => {
  try {
    const { amount, hours, method, rfid } = req.body;

    if (!amount || !hours || !method || !rfid) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            payment_method_types: [method],
            line_items: [
              {
                name: `${hours} Hours Load`,
                amount: amount * 100,
                currency: "PHP",
                quantity: 1
              }
            ],
            description: `${hours} Hours | RFID: ${rfid}`,
            amount: amount * 100,
            currency: "PHP",

            success_url: "https://web-e21c.onrender.com/success",
            cancel_url: "https://web-e21c.onrender.com/cancel",

            metadata: { rfid, hours, amount }
          }
        }
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64"
            ),
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      checkout_url: response.data.data.attributes.checkout_url
    });
  } catch (err) {
    console.error("❌ Checkout Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Checkout failed" });
  }
});

/* ============================================================
   PAYMONGO WEBHOOK — RAW BODY IS ALREADY PROVIDED BY server.js
   ============================================================ */
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["paymongo-signature"];
    const rawBody = req.body; // Buffer (from server.js raw parser)

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.log("❌ rawBody is not a buffer");
      return res.status(400).send("Invalid body");
    }

    // Compute expected signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSig !== signature) {
      console.log("❌ Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    console.log("✅ Valid webhook signature");

    const event = JSON.parse(rawBody.toString());

    if (event.data?.attributes?.type === "payment.paid") {
      const payment = event.data.attributes.data.attributes;

      const rfid = payment.metadata.rfid;
      const hours = Number(payment.metadata.hours);

      console.log("🎉 PAYMENT SUCCESS");
      console.log("RFID:", rfid);
      console.log("Hours Purchased:", hours);

      const user = await User.findOne({ rfid });

      if (!user) {
        console.log("❌ RFID not found:", rfid);
        return res.sendStatus(200);
      }

      user.timeCredits = (user.timeCredits || 0) + hours;
      await user.save();

      console.log("⏳ NEW TIME BALANCE:", user.timeCredits);
    }

    return res.sendStatus(200);
    
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.sendStatus(500);
  }
});

export default router;
