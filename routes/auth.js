import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/login.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1️⃣ Check for missing fields
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide both email and password" });
    }

    // 2️⃣ Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3️⃣ Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 4️⃣ Return success response WITHOUT JWT
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error, please try again later" });
  }
});

export default router;
