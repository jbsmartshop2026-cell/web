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
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64"
            ),
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
   PAYMONGO WEBHOOK — WITH CORRECT SIGNATURE VALIDATION
============================================================ */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const rawBody = req.body.toString();
    const sigHeader = req.headers["paymongo-signature"];
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

    console.log("🔥 RAW HEADERS:", req.headers);
    console.log("🔥 RAW BODY:", rawBody);

    if (!sigHeader) {
      console.log("❌ No signature header");
      return res.status(400).send("Missing signature");
    }

    /* ------------------------------------------------------------
       PayMongo FORMAT:
       t=173…, v1=abcdef123456
    ------------------------------------------------------------- */
    let timestamp = null;
    let expectedSig = null;

    sigHeader.split(",").forEach((part) => {
      part = part.trim();
      if (part.startsWith("t=")) timestamp = part.substring(2);
      if (part.startsWith("v1=")) expectedSig = part.substring(3);
    });

    if (!timestamp || !expectedSig) {
      console.log("❌ Invalid signature format:", sigHeader);
      return res.status(400).send("Invalid signature");
    }

    /* ------------------------------------------------------------
       SIGNATURE VALIDATION
    ------------------------------------------------------------- */
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

    /* ------------------------------------------------------------
       PARSE JSON
    ------------------------------------------------------------- */
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.log("❌ Invalid JSON body");
      return res.status(400).send("Invalid JSON");
    }

    const type = event.data?.attributes?.type;
    const metadata = event.data?.attributes?.data?.attributes?.metadata;

    console.log("🔔 Event Type:", type);
    console.log("📌 Metadata:", metadata);

    /* ============================================================
       PAYMENT SUCCESS HANDLING
    ============================================================= */
    if (type === "checkout_session.payment.paid") {
      if (!metadata?.rfid || !metadata?.hours) {
        console.log("❌ Missing metadata");
        return res.sendStatus(200);
      }

      const rfid = String(metadata.rfid).trim();
      const hours = Number(metadata.hours);
      const amount = Number(metadata.amount);
      const method = metadata.method;

      const user = await User.findOne({ rfid });

      if (!user) {
        console.log("❌ User not found:", rfid);
        return res.sendStatus(200);
      }

      user.timeCredits = (user.timeCredits || 0) + hours;
      await user.save();

      await Transaction.create({
        userId: user._id,
        rfid,
        amount,
        hours,
        method,
      });

      console.log("💾 Transaction Saved for RFID:", rfid);
    }

    return res.sendStatus(200);
  }
);

export default router;
