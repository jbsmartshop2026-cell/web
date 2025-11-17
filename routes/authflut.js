import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check user in database (plain text password)
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Successful login
    res.status(200).json({
  _id: user._id,         // ✅ FIXED
  name: user.name,
  email: user.email,
  profile_image: user.picture
});

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
