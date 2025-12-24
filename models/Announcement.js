const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'IABA Admin'
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  category: {
    type: String,
    enum: ['GENERAL', 'EVENT', 'PRAYER', 'COMMUNITY', 'EMERGENCY', 'FUNDRAISING'],
    default: 'GENERAL'
  },
  imageUrl: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  // Optional: Link to related event if announcement is event-related
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  // Track views/engagement
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for better query performance
announcementSchema.index({ isActive: 1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 });

// Virtual field to check if announcement is expired
announcementSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to increment view count
announcementSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  return this.save();
};

const Announcement = mongoose.model('announcements', announcementSchema);

module.exports = Announcement;
