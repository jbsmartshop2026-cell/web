import express from "express";
import crypto from "crypto";
import axios from "axios";

const router = express.Router();

// ------------------------------
// CREATE CHECKOUT
// ------------------------------
router.post("/create-checkout", async (req, res) => {
  try {
    const { amount, hours, method, rfid } = req.body;

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            amount: amount * 100,
            payment_method_types: [method],
            description: `${hours} Hours Time Credit`,
            line_items: [
              {
                name: `${hours} Hours`,
                amount: amount * 100,
                currency: "PHP",
                quantity: 1,
              },
            ],
            success_url: "https://web-e21c.onrender.com/success",
            cancel_url: "https://web-e21c.onrender.com/cancel",
            metadata: { rfid, hours },
          },
        },
      },
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
    console.error("Checkout Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Checkout creation failed" });
  }
});

// ------------------------------
// PAYMONGO WEBHOOK
// ------------------------------
router.post("/webhook", (req, res) => {
  const signature = req.headers["paymongo-signature"];
  const rawBody = req.body.toString();

  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (computed !== signature) {
    console.log("❌ Invalid webhook signature");
    return res.status(400).send("Invalid signature");
  }

  const data = JSON.parse(rawBody);

  // Detect successful payment
  if (data.data.attributes.type === "payment.paid") {
    const paymentInfo = data.data.attributes.data.attributes;

    const rfid = paymentInfo.metadata.rfid;
    const hours = parseInt(paymentInfo.metadata.hours);

    console.log("✅ Payment success for RFID:", rfid);
    console.log("⏳ Hours purchased:", hours);

    // TODO: update user’s time credit in MongoDB
  }

  res.sendStatus(200);
});

export default router;
