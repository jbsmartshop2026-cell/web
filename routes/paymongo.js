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
              amount: amount * 100,
              currency: "PHP",
              quantity: 1,
            },
          ],
          description: `${hours} Hours | RFID: ${rfid}`,
          amount: amount * 100,
          currency: "PHP",
          success_url: "https://web-e21c.onrender.com/success",
          cancel_url: "https://web-e21c.onrender.com/cancel",
          metadata: {
            rfid: String(rfid),
            hours: Number(hours),
          },
        },
      },
    };

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      payload,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      checkout_url: response.data.data.attributes.checkout_url,
    });
  } catch (err) {
    console.error("❌ Checkout Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Checkout failed" });
  }
});

/* ============================================================
   PAYMONGO WEBHOOK (raw JSON preserved)
============================================================ */
router.post("/webhook", async (req, res) => {
  try {
    const rawBody = req.body; // REAL RAW BUFFER

    const sigHeader = req.headers["paymongo-signature"];
    if (!sigHeader) return res.status(400).send("Missing signature");

    const timestamp = sigHeader.split(",").find((p) => p.startsWith("t="))?.slice(2);
    const signature = sigHeader.split(",").find((p) => p.startsWith("v1="))?.slice(3);

    const payloadToSign = `${timestamp}.${rawBody.toString()}`;

    const expected = crypto
      .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET)
      .update(payloadToSign)
      .digest("hex");

    if (expected !== signature) {
      console.log("❌ Invalid signature");
      return res.status(400).send("Invalid signature");
    }

    console.log("✅ Signature OK!");

    const event = JSON.parse(rawBody.toString());
    console.log("📩 Event:", event.data?.attributes?.type);

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.sendStatus(500);
  }
});

export default router;
