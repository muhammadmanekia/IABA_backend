const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

// Get all messages
router.get("/", messageController.getMessages);

// Create new message
router.post("/", messageController.postMessages);

// Update and delete messages
router.put("/:id", messageController.updateMessage);
router.delete("/:id", messageController.deleteMessage);

module.exports = router;

