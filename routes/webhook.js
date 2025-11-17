const express = require("express");
const router = express.Router();
const crypto = require("crypto");

router.post("/paymongo", express.raw({ type: "*/*" }), (req, res) => {
  const signature = req.headers["paymongo-signature"];
  const rawBody = req.body.toString();

  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  if (computed !== signature) {
    return res.status(400).send("Invalid signature");
  }

  const data = JSON.parse(rawBody);

  if (data.data.attributes.type === "payment.paid") {
    console.log("Payment success:", data.data.id);

    // TODO: Add time credits to user here
  }

  res.sendStatus(200);
});

module.exports = router;
