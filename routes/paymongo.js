import express from "express";
import crypto from "crypto";
import axios from "axios";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

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
   PAYMONGO WEBHOOK — QRPH + CHECKOUT COMPATIBLE
============================================================ */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sigHeader = req.headers["paymongo-signature"];
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

    if (!sigHeader) {
      console.log("❌ No signature header");
      return res.status(400).send("Missing signature");
    }
    console.log("🔥 RAW HEADERS:", req.headers);
    console.log("🔥 RAW BODY:", req.body.toString());

    /* ============================================================
       SIGNATURE PARSING (WORKS FOR QRPH + ALL METHODS)
    ============================================================= */
    let timestamp = null;
    let expectedSig = null;

    if (sigHeader.includes("t=")) {
      // Standard PayMongo checkout
      sigHeader.split(",").forEach((part) => {
        if (part.startsWith("t=")) timestamp = part.replace("t=", "");
        if (part.startsWith("te=")) expectedSig = part.replace("te=", "");
      });
    } else if (sigHeader.includes("payout_signature=")) {
      // QRPH format (no timestamp)
      expectedSig = sigHeader.replace("payout_signature=", "").trim();
      timestamp = "0";
    } else if (sigHeader.includes("signature=")) {
      // Another QRPH variant
      expectedSig = sigHeader.replace("signature=", "").trim();
      timestamp = "0";
    }

    if (!expectedSig) {
      console.log("❌ Invalid signature format");
      return res.status(400).send("Invalid signature");
    }

    /* ============================================================
       SIGNATURE COMPUTATION
    ============================================================= */
    const rawBody = req.body.toString();
    let signedPayload = rawBody;

    if (timestamp !== "0") {
      signedPayload = `${timestamp}.${rawBody}`;
    }

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
        PARSE PAYLOAD
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
       HANDLE SUCCESSFUL PAYMENT
    ============================================================= */
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

      const user = await User.findOne({ rfid: cleanRFID });
      if (!user) {
        console.log("❌ User not found:", cleanRFID);
        return res.sendStatus(200);
      }

      user.timeCredits = (user.timeCredits || 0) + cleanHours;
      await user.save();

      console.log(`✅ Added ${cleanHours} hours to RFID ${cleanRFID}`);

      /* ============================================================
         SAVE TRANSACTION
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
  }
);

export default router;
