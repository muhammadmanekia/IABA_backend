const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    user: {
        type: String,
        required: false // Optional, can be ObjectId or custom string ID
    },
    userName: {
        type: String, // Snapshot of name in case user is deleted/optional
        required: false
    },
    userEmail: {
        type: String,
        required: false
    },
    type: {
        type: String,
        enum: ['App', 'Organization'],
        required: true
    },
    category: {
        type: String,
        enum: ['General', 'Bug', 'Feature Request', 'Site Improvement', 'Program Improvement', 'Safety Hazard', 'Other'],
        default: 'General'
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['New', 'In Progress', 'Resolved', 'Closed'],
        default: 'New'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
