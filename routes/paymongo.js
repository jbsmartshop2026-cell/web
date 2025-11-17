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

    const payload = {
      data: {
        attributes: {
          payment_method_types: [method],
          line_items: [
            {
              name: `${hours} Hours Load`,
              amount: amount * 100, // cents
              currency: "PHP",
              quantity: 1
            }
          ],
          description: `${hours} Hours | RFID: ${rfid}`,
          amount: amount * 100,
          currency: "PHP",

          success_url: "https://web-e21c.onrender.com/success",
          cancel_url: "https://web-e21c.onrender.com/cancel",

          metadata: {
            rfid: String(rfid),
            hours: Number(hours)
          }
        }
      }
    };

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      payload,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
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
   PAYMONGO WEBHOOK — RAW BODY ONLY
============================================================ */
router.post(
  "/webhook",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      const signature = req.headers["paymongo-signature"];
      const rawBody = req.body; // Buffer

      if (!Buffer.isBuffer(rawBody)) {
        console.log("❌ Webhook received NON-buffer!");
        return res.status(400).send("Invalid body");
      }

      // === Validate Signature ===
      const expectedSignature = crypto
        .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.log("❌ Invalid signature");
        return res.status(400).send("Invalid signature");
      }

      console.log("✅ Valid webhook signature");

      const event = JSON.parse(rawBody.toString());
      const type = event.data?.attributes?.type;

      // === PAYMENT SUCCESS ===
      if (type === "payment.paid") {
        const payment = event.data.attributes.data.attributes;

        const rfid = payment.metadata?.rfid;
        const hours = Number(payment.metadata?.hours || 0);

        console.log("🎉 PAYMENT SUCCESS:", rfid, hours);

        if (!rfid || !hours) {
          console.log("❌ Missing RFID or HOURS in metadata");
          return res.sendStatus(200);
        }

        // Find user
        const user = await User.findOne({ rfid });

        if (!user) {
          console.log("❌ User not found for RFID:", rfid);
          return res.sendStatus(200);
        }

        // Add hours
        user.timeCredits = (user.timeCredits || 0) + hours;
        await user.save();

        console.log("⏳ Updated Time Credits:", user.timeCredits);
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error("❌ Webhook Error:", err);
      return res.sendStatus(500);
    }
  }
);

export default router;
