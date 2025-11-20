import express from "express";
import crypto from "crypto";
import axios from "axios";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js"; // ✅ MUST ADD THIS

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
            rfid: String(rfid).trim(),
            hours: Number(hours),
            amount,
            method,
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
   PAYMONGO WEBHOOK — RAW BODY VALIDATION
============================================================ */
router.post("/webhook", async (req, res) => {
  const sigHeader = req.headers["paymongo-signature"];
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!sigHeader) {
    console.log("❌ No signature header");
    return res.status(400).send("Missing signature");
  }

  let timestamp, expectedSig;
  sigHeader.split(",").forEach((part) => {
    if (part.startsWith("t=")) timestamp = part.replace("t=", "");
    if (part.startsWith("te=")) expectedSig = part.replace("te=", "");
  });

  if (!timestamp || !expectedSig) {
    console.log("❌ Invalid signature format");
    return res.status(400).send("Invalid signature");
  }

  const rawBody = req.body.toString();
  const signedPayload = `${timestamp}.${rawBody}`;

  const computedSig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  if (computedSig !== expectedSig) {
    console.log("❌ INVALID SIGNATURE");
    return res.status(400).send("Invalid signature");
  }

  console.log("✅ SIGNATURE VERIFIED");

  /* ============================================================
       PARSE JSON BODY
  ============================================================= */
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.log("❌ Invalid JSON");
    return res.status(400).send("Invalid JSON");
  }

  const type = event.data?.attributes?.type;
  const metadata = event.data?.attributes?.data?.attributes?.metadata;

  console.log("🔔 Webhook Event:", type);
  console.log("📌 Metadata:", metadata);

  /* ============================================================
       HANDLE PAYMENT SUCCESS
============================================================ */
  if (type === "checkout_session.payment.paid") {
    if (!metadata?.rfid || !metadata?.hours) {
      console.log("❌ Metadata missing RFID or Hours");
      return res.sendStatus(200);
    }

    const cleanRFID = String(metadata.rfid).trim();
    const cleanHours = Number(metadata.hours);
    const cleanAmount = Number(metadata.amount);
    const cleanMethod = metadata.method;

    console.log("🧹 Clean RFID:", cleanRFID);
    console.log("⏱ Clean Hours:", cleanHours);

    // Find user
    const user = await User.findOne({ rfid: cleanRFID });

    if (!user) {
      console.log("❌ User not found:", cleanRFID);
      return res.sendStatus(200);
    }

    // Add time credits
    user.timeCredits = (user.timeCredits || 0) + cleanHours;
    await user.save();
    console.log(`✅ Added ${cleanHours} hours to RFID ${cleanRFID}`);

    /* ============================================================
       SAVE TRANSACTION IN DATABASE (IMPORTANT FIX)
    ============================================================= */
    await Transaction.create({
      userId: user._id,
      rfid: cleanRFID,
      amount: cleanAmount,
      hours: cleanHours,
      method: cleanMethod,
    });

    console.log("💾 Transaction Saved!");
  }

  return res.sendStatus(200);
});

export default router;
