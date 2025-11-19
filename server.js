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

dotenv.config();

const app = express();
const __dirname = path.resolve();

/* ============================================================
   STATIC FILES (IMPORTANT FOR PROFILE PICTURES)
   ============================================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ============================================================
   BODY PARSERS
   ============================================================ */

// Normal JSON
app.use(express.json());

// Raw body ONLY for PayMongo Webhook
app.use(
  "/api/paymongo/webhook",
  bodyParser.raw({ type: "*/*" })
);

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

// time history
app.use("/api", historyRoutes);

// PayMongo routes
app.use("/api/paymongo", paymongoRoutes);

// promos / rfid
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
