import express from "express";
import Promo from "../models/Promo.js";

const router = express.Router();

// Get all promos
router.get("/", async (req, res) => {
  try {
    const promos = await Promo.find();
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new promo
router.post("/", async (req, res) => {
  const { price, hours } = req.body;
  const name = `₱${price} for ${hours} Hours`;
  const promo = new Promo({ name, price, hours });
  try {
    const newPromo = await promo.save();
    res.status(201).json(newPromo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a promo
router.put("/:id", async (req, res) => {
  const { price, hours } = req.body;
  const name = `₱${price} for ${hours} Hours`;

  try {
    const updatedPromo = await Promo.findByIdAndUpdate(
      req.params.id,
      { price, hours, name },
      { new: true }
    );
    res.json(updatedPromo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a promo (optional)
router.delete("/:id", async (req, res) => {
  try {
    await Promo.findByIdAndDelete(req.params.id);
    res.json({ message: "Promo deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
