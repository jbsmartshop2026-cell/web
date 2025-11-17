import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import authflutRoutes from "./routes/authflut.js";
import userRoutes from "./routes/users.js";
import paymongoRoutes from "./routes/paymongo.js";  // ONLY THIS FOR PAYMONGO
import promosRoutes from "./routes/promos.js";
import rfidRoutes from "./routes/rfid.js";
import bodyParser from "body-parser";

dotenv.config();

const app = express();

// Handle JSON normally
app.use(express.json());

// Webhook needs raw body (PayMongo requirement)
app.use(
  "/api/paymongo/webhook",
  bodyParser.raw({ type: "*/*" })
);

// CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/authflut", authflutRoutes);
app.use("/api/users", userRoutes);

// All PayMongo routes here
app.use("/paymongo", paymongoRoutes);
app.use("/api/promos", promosRoutes);
app.use("/api/rfid", rfidRoutes);

app.get("/", (req, res) => res.send("SmartShop API running!"));

// DB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
