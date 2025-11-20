import express from "express";
import User from "../models/User.js";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import TimeLog from "../models/Logs.js";
import Transaction from "../models/Transaction.js";


const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });



router.get("/users/:id/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.id })
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (err) {
    console.error("Transaction Fetch Error:", err);
    res.status(500).json({ error: "Failed to get transactions" });
  }
});

// GET all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE user
router.post("/", upload.single("picture"), async (req, res) => {
  try {
    const newUser = new User({
      ...req.body,
      picture: req.file ? req.file.filename : "",
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE user
router.put("/:id", upload.single("picture"), async (req, res) => {
  try {
    const updatedData = { ...req.body };
    if (req.file) updatedData.picture = req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET user by id  ✔ FIXED ROUTE
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE user
router.delete("/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:userId/tap-status", async (req, res) => {
  try {
    const { userId } = req.params;

    const active = await TimeLog.findOne({
      userId,
      action: "start",
      sessionClosed: false
    });

    return res.json({
      status: active ? "active" : "inactive"
    });

  } catch (err) {
    console.error("Tap-status error:", err);
    res.status(500).json({ status: "inactive" });
  }
});







export default router;
