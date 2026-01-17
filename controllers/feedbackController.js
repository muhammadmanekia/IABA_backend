const Feedback = require('../models/Feedback');

// Submit new feedback
exports.submitFeedback = async (req, res) => {
    try {
        const { userId, userName, userEmail, type, category, message } = req.body;

        // Basic validation
        if (!message || !type) {
            return res.status(400).json({ message: 'Type and Message are required' });
        }

        const feedback = new Feedback({
            user: userId || null,
            userName: userName || 'Anonymous',
            userEmail: userEmail || '',
            type,
            category,
            message
        });

        await feedback.save();

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback
        });

    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Server error submitting feedback'
        });
    }
};

// Get all feedback (for admin usage later)
exports.getAllFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 });
        res.status(200).json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Server error fetching feedback' });
    }
};
