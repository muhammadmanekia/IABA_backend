const express = require('express');
const router = express.Router();

// Admin password - KEEP THIS SECRET, NEVER EXPOSE TO FRONTEND
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'iaba';

// Verify admin password
router.post('/verify-admin', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        // Check if password matches
        if (password === ADMIN_PASSWORD) {
            return res.status(200).json({
                success: true,
                message: 'Admin access granted',
                isAdmin: true
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin password'
            });
        }
    } catch (error) {
        console.error('Error verifying admin password:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
