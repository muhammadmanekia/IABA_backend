const express = require('express');
const router = express.Router();
const {
  getAllAnnouncements,
  getAnnouncementsByCategory,
  getAnnouncementById,
  getUrgentAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  permanentlyDeleteAnnouncement,
  togglePin,
  getAllAnnouncementsAdmin
} = require('../controllers/announcementController');

// Public routes - Get announcements
router.get('/', getAllAnnouncements);
router.get('/urgent', getUrgentAnnouncements);
router.get('/category/:category', getAnnouncementsByCategory);
router.get('/admin/all', getAllAnnouncementsAdmin);
router.get('/:id', getAnnouncementById);

// Admin routes - Create, Update, Delete
router.post('/', createAnnouncement);
router.put('/:id', updateAnnouncement);
router.patch('/:id/toggle-pin', togglePin);
router.delete('/:id', deleteAnnouncement);
router.delete('/:id/permanent', permanentlyDeleteAnnouncement);

module.exports = router;
