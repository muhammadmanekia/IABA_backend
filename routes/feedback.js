const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Review: ideally we should add auth middleware here if we want to restrict to logged-in users
// const auth = require('../middleware/auth'); 

// POST /api/feedback
router.post('/', feedbackController.submitFeedback);

// GET /api/feedback (Admin only - potentially add middleware later)
router.get('/', feedbackController.getAllFeedback);

module.exports = router;
