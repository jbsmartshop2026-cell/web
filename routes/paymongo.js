import express from "express";
import crypto from "crypto";
import axios from "axios";
import User from "../models/User.js";

const router = express.Router();

/* ============================================================
   CHECKOUT SESSION
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
   PAYMONGO WEBHOOK (RAW)
============================================================ */
router.post("/webhook", async (req, res) => {
  try {
    const rawBody = req.body;

    console.log("======= 📩 WEBHOOK RECEIVED =======");
    console.log("Raw Body Buffer:", rawBody);
    console.log("Raw Body String:", rawBody.toString());
    console.log("Headers:", req.headers);

    const sigHeader = req.headers["paymongo-signature"];
    console.log("Signature Header:", sigHeader);

    if (!sigHeader) {
      console.log("❌ No signature header");
      return res.status(400).send("Missing signature");
    }

    // Extract timestamp + v1 signature
    const timestamp = sigHeader.split(",").find((p) => p.startsWith("t="))?.slice(2);
    const signature = sigHeader.split(",").find((p) => p.startsWith("v1="))?.slice(3);

    console.log("Timestamp:", timestamp);
    console.log("Received Signature:", signature);

    const payloadToSign = `${timestamp}.${rawBody.toString()}`;
    console.log("Payload to sign:", payloadToSign);

    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    console.log("Loaded SECRET:", secret);

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payloadToSign)
      .digest("hex");

    console.log("Expected Signature:", expected);

    if (expected !== signature) {
      console.log("❌ SIGNATURE MISMATCH!");
      return res.status(400).send("Invalid signature");
    }

    console.log("✅ Signature verified");

    const event = JSON.parse(rawBody.toString());
    console.log("📦 Event Type:", event?.data?.attributes?.type);

    console.log("====================================");

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ DEBUG ERROR:", err);
    return res.sendStatus(500);
  }
});


export default router;
