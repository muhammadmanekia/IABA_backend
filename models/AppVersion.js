const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema({
    version: {
        type: String,
        required: true,
    },
    platform: {
        type: String,
        required: true,
        enum: ['ios', 'android'],
    },
    minVersion: {
        type: String,
        required: true,
    },
    forceUpdate: {
        type: Boolean,
        default: false,
    },
    updateMessage: {
        type: String,
        default: 'A new version is available. Please update to enjoy the latest features and improvements.',
    },
    storeUrl: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// Ensure only one active version per platform
appVersionSchema.index({ platform: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model('AppVersion', appVersionSchema);
