import express from "express";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

// ======================================
// CREATE CHECKOUT SESSION
// ======================================
router.post("/create-checkout", async (req, res) => {
  const { amount, hours, method, rfid } = req.body;

  // Validate
  if (!amount || !hours || !method || !rfid) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Convert amount to integer (PayMongo requires integer cents)
  const totalAmount = Number(amount) * 100;

  try {
    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            payment_method_types: [method],
            success_url: "https://web-e21c.onrender.com/success",
            cancel_url: "https://web-e21c.onrender.com/cancel",

            line_items: [
              {
                amount: totalAmount,
                currency: "PHP",
                name: `${hours} Hours Load`,
                description: `RFID: ${rfid}`,
                quantity: 1,
              }
            ],

            metadata: {
              rfid,
              hours,
              amount
            }
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
        },
      }
    );

    return res.json({
      checkout_url: response.data.data.attributes.checkout_url,
    });

  } catch (error) {
    console.error("PAYMONGO ERROR:", error.response?.data || error);
    return res.status(500).json({ error: "PayMongo checkout failed" });
  }
});


// ======================================
// WEBHOOK ENDPOINT
// ======================================
router.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["paymongo-signature"];
  const rawBody = req.body.toString();

  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(400).send("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody);

  if (event.data.attributes.type === "payment.paid") {
    const metadata = event.data.attributes.data.attributes.metadata;

    console.log("PAYMENT SUCCESS:");
    console.log("RFID:", metadata.rfid);
    console.log("Hours:", metadata.hours);
    console.log("Amount:", metadata.amount);
  }

  res.sendStatus(200);
});

export default router;
