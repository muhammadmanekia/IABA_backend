const express = require("express");
const router = express.Router();
const Rsvp = require("../models/Rsvp");

// Create a new RSVP
router.post("/", async (req, res) => {
  const { userID, event, name, email, numberOfGuests, additionalNotes } =
    req.body;

  try {
    const rsvp = new Rsvp({
      event,
      user: userID ? userID : null,
      name,
      email,
      numberOfGuests,
      additionalNotes,
    });

    const newRsvp = await rsvp.save();
    res.status(201).json({ message: "RSVP successfully submitted", newRsvp });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get RSVPs for a specific event
router.get("/:eventId", async (req, res) => {
  try {
    const rsvps = await Rsvp.find({ event: req.params.eventId }).populate(
      "user",
      "username email"
    );
    res.json(rsvps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get RSVPs for a specific user
router.get("/user/:userId", async (req, res) => {
  try {
    const rsvps = await Rsvp.find({ user: req.params.userId });
    res.json(rsvps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get RSVPs for a guest by email
router.get("/guest/:email", async (req, res) => {
  try {
    const rsvps = await Rsvp.find({ email: req.params.email });
    res.json(rsvps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete RSVP by userId and eventId
router.delete("/:eventId/user/:userId", async (req, res) => {
  const { eventId, userId } = req.params;

  try {
    const deletedRsvp = await Rsvp.findOneAndDelete({
      event: eventId,
      user: userId,
    });

    if (!deletedRsvp) {
      return res
        .status(404)
        .json({ message: "RSVP not found for this user and event." });
    }

    res.status(200).json({ message: "RSVP successfully deleted." });
  } catch (error) {
    console.error("Error deleting RSVP:", error);
    res.status(500).json({ message: error.message });
  }
});

// Delete Guest RSVP by email and eventId
router.delete("/:eventId/guest/:email", async (req, res) => {
  const { eventId, email } = req.params;

  try {
    const deletedRsvp = await Rsvp.findOneAndDelete({
      event: eventId,
      email: email,
    });

    if (!deletedRsvp) {
      return res
        .status(404)
        .json({ message: "Guest RSVP not found for this email and event." });
    }

    res.status(200).json({ message: "Guest RSVP successfully deleted." });
  } catch (error) {
    console.error("Error deleting Guest RSVP:", error);
    res.status(500).json({ message: error.message });
  }
});

// Additional routes for updating and deleting RSVPs
// ...

module.exports = router;
