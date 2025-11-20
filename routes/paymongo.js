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
            rfid: String(rfid).trim(),
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
   PAYMONGO WEBHOOK (RAW BODY)
============================================================ */
router.post("/webhook", async (req, res) => {
  const sigHeader = req.headers["paymongo-signature"];
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  let timestamp, expectedSig;
  sigHeader.split(",").forEach((part) => {
    if (part.startsWith("t=")) timestamp = part.slice(2);
    if (part.startsWith("te=")) expectedSig = part.slice(3);
  });

  const rawBody = req.body.toString();
  const payloadToSign = `${timestamp}.${rawBody}`;

  const computedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  if (computedSig !== expectedSig) {
    console.log("❌ INVALID SIGNATURE");
    return res.status(400).send("Invalid signature");
  }

  console.log("✅ SIGNATURE VERIFIED");

  /* ============================================================
     PARSE WEBHOOK PAYLOAD
  ============================================================ */
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.log("❌ Invalid JSON body");
    return res.status(400).send("Invalid JSON");
  }

  const type = event.data?.attributes?.type;
  const metadata = event.data?.attributes?.data?.attributes?.metadata;

  console.log("Webhook Type:", type);
  console.log("Metadata:", metadata);

  /* ============================================================
     PAYMENT SUCCESS HANDLER
  ============================================================ */

  if (type === "checkout_session.payment.paid") {
    if (!metadata || !metadata.rfid || !metadata.hours) {
      console.log("❌ Missing metadata");
      return res.sendStatus(200);
    }

    const cleanRFID = String(metadata.rfid).trim();
    const cleanHours = Number(metadata.hours);

    console.log("🔍 Clean RFID:", cleanRFID);
    console.log("🔍 Clean Hours:", cleanHours);

    const user = await User.findOne({ rfid: cleanRFID });

    if (!user) {
      console.log("❌ User not found for RFID:", cleanRFID);
      return res.sendStatus(200);
    }

    user.timeCredits = (user.timeCredits || 0) + cleanHours;
    await user.save();

    console.log(`✅ Added ${cleanHours} hours to RFID: ${cleanRFID}`);
  }

  return res.sendStatus(200);
});

export default router;
