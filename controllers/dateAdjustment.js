const express = require("express");
const router = express.Router();
const Adjustment = require("../models/Adjustment"); // MongoDB model

// Save or update the adjustment
router.post("/save-adjustment", async (req, res) => {
  const { adjustment } = req.body;
  try {
    const result = await Adjustment.findOneAndUpdate(
      { key: "dateAdjustment" },
      { value: adjustment },
      { upsert: true, new: true }
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to save adjustment" });
  }
});

// Retrieve the adjustment
router.get("/get-adjustment", async (req, res) => {
  try {
    const adjustment = await Adjustment.find({ key: "dateAdjustment" });
    console.log(adjustment);
    res.status(200).json(adjustment);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch adjustment" });
  }
});

// Toggle a 30-day override for a specific Islamic month/year (adds if absent, removes if present)
router.post("/toggle-month-length", async (req, res) => {
  const { islamicYear, islamicMonth } = req.body;
  if (islamicYear == null || islamicMonth == null) {
    return res.status(400).json({ error: "islamicYear and islamicMonth are required" });
  }
  const key = `monthLength_${islamicYear}_${islamicMonth}`;
  try {
    const existing = await Adjustment.findOne({ key });
    if (existing) {
      await Adjustment.deleteOne({ key });
      res.status(200).json({ active: false, key });
    } else {
      await Adjustment.findOneAndUpdate({ key }, { value: 30 }, { upsert: true, new: true });
      res.status(200).json({ active: true, key });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle month length" });
  }
});

// Retrieve all 30-day month overrides
router.get("/get-month-lengths", async (req, res) => {
  try {
    const entries = await Adjustment.find({ key: /^monthLength_/ });
    const parsed = entries.map((e) => {
      const parts = e.key.split("_");
      return { islamicYear: parseInt(parts[1]), islamicMonth: parseInt(parts[2]) };
    });
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch month lengths" });
  }
});

module.exports = router;
