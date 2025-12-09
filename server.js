import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import bodyParser from "body-parser";

import authRoutes from "./routes/auth.js";
import authflutRoutes from "./routes/authflut.js";
import userRoutes from "./routes/users.js";
import paymongoRoutes from "./routes/paymongo.js";
import promosRoutes from "./routes/promos.js";
import rfidRoutes from "./routes/rfid.js";
import historyRoutes from "./routes/history.js";
import transactionsRoutes from "./routes/transactions.js";


dotenv.config();

const app = express();
const __dirname = path.resolve();

/* ============================================================
   STATIC FILES
============================================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ============================================================
   PAYMONGO WEBHOOK RAW BODY (must be BEFORE express.json)
============================================================ */
app.use("/api/paymongo/webhook", express.raw({ type: "application/json" }));

/* ============================================================
   NORMAL JSON BODY PARSER (AFTER WEBHOOK)
============================================================ */
app.use(express.json());

/* ============================================================
   CORS
============================================================ */
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

/* ============================================================
   ROUTES
============================================================ */
app.use("/api/auth", authRoutes);
app.use("/api/authflut", authflutRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionsRoutes);


app.use("/api", historyRoutes);

// PayMongo Routes
app.use("/api/paymongo", paymongoRoutes);

app.use("/api/promos", promosRoutes);
app.use("/api/rfid", rfidRoutes);

app.get("/", (req, res) => res.send("SmartShop API running!"));


/* ============================================================
   DATABASE
============================================================ */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));


/* ============================================================
   START SERVER
============================================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
