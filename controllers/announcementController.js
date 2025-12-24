const Announcement = require('../models/Announcement');

/**
 * Get all active announcements
 * Filters out expired announcements and sorts by pinned first, then by creation date
 */
exports.getAllAnnouncements = async (req, res) => {
  try {
    const currentDate = new Date();

    const announcements = await Announcement.find({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: currentDate } }
      ]
    })
    .populate('relatedEvent', 'title date startTime endTime location')
    .sort({ isPinned: -1, createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get announcements by category
 */
exports.getAnnouncementsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const currentDate = new Date();

    const announcements = await Announcement.find({
      isActive: true,
      category: category.toUpperCase(),
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: currentDate } }
      ]
    })
    .populate('relatedEvent', 'title date startTime endTime location')
    .sort({ isPinned: -1, createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements by category:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get a single announcement by ID
 */
exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('relatedEvent', 'title date startTime endTime location');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Increment view count
    await announcement.incrementViewCount();

    res.json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get urgent/high priority announcements
 */
exports.getUrgentAnnouncements = async (req, res) => {
  try {
    const currentDate = new Date();

    const announcements = await Announcement.find({
      isActive: true,
      priority: { $in: ['HIGH', 'URGENT'] },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: currentDate } }
      ]
    })
    .populate('relatedEvent', 'title date startTime endTime location')
    .sort({ priority: -1, createdAt: -1 })
    .limit(5);

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching urgent announcements:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new announcement
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      author,
      priority,
      category,
      imageUrl,
      isActive,
      expiresAt,
      isPinned,
      relatedEvent
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        message: 'Title and content are required'
      });
    }

    const announcement = new Announcement({
      title,
      content,
      author,
      priority,
      category,
      imageUrl,
      isActive,
      expiresAt,
      isPinned,
      relatedEvent
    });

    const savedAnnouncement = await announcement.save();

    // Populate relatedEvent if it exists
    await savedAnnouncement.populate('relatedEvent', 'title date startTime endTime location');

    res.status(201).json(savedAnnouncement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update an existing announcement
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('relatedEvent', 'title date startTime endTime location');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete an announcement (soft delete by setting isActive to false)
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({
      message: 'Announcement deleted successfully',
      announcement
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Permanently delete an announcement (hard delete)
 */
exports.permanentlyDeleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({
      message: 'Announcement permanently deleted successfully'
    });
  } catch (error) {
    console.error('Error permanently deleting announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle pin status of an announcement
 */
exports.togglePin = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    res.json(announcement);
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all announcements including inactive ones (for admin panel)
 */
exports.getAllAnnouncementsAdmin = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('relatedEvent', 'title date startTime endTime location')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    res.status(500).json({ message: error.message });
  }
};
