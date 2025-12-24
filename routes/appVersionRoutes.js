const express = require('express');
const router = express.Router();
const AppVersion = require('../models/AppVersion');

// Helper function to compare versions (semantic versioning)
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;

        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }

    return 0;
}

// GET /api/app-version/check - Check if update is available
router.get('/check', async (req, res) => {
    try {
        const { version, platform } = req.query;

        if (!version || !platform) {
            return res.status(400).json({
                message: 'Version and platform are required'
            });
        }

        // Get active version info for platform
        const versionInfo = await AppVersion.findOne({
            platform: platform.toLowerCase(),
            isActive: true
        });

        if (!versionInfo) {
            return res.json({
                updateAvailable: false,
                message: 'No version information available',
            });
        }

        // Compare current version with minimum required version
        const needsUpdate = compareVersions(version, versionInfo.minVersion) < 0;
        const latestAvailable = compareVersions(version, versionInfo.version) < 0;

        res.json({
            updateAvailable: needsUpdate || latestAvailable,
            forceUpdate: needsUpdate && versionInfo.forceUpdate,
            currentVersion: version,
            latestVersion: versionInfo.version,
            minVersion: versionInfo.minVersion,
            updateMessage: versionInfo.updateMessage,
            storeUrl: versionInfo.storeUrl,
        });
    } catch (error) {
        console.error('Error checking app version:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/app-version - Create or update version info (admin only)
router.post('/', async (req, res) => {
    try {
        const { version, platform, minVersion, forceUpdate, updateMessage, storeUrl } = req.body;

        if (!version || !platform || !minVersion || !storeUrl) {
            return res.status(400).json({
                message: 'Version, platform, minVersion, and storeUrl are required'
            });
        }

        // Deactivate existing active version for this platform
        await AppVersion.updateMany(
            { platform: platform.toLowerCase(), isActive: true },
            { isActive: false }
        );

        // Create new version record
        const newVersion = new AppVersion({
            version,
            platform: platform.toLowerCase(),
            minVersion,
            forceUpdate: forceUpdate || false,
            updateMessage: updateMessage || 'A new version is available. Please update to enjoy the latest features and improvements.',
            storeUrl,
            isActive: true,
        });

        await newVersion.save();

        res.status(201).json({
            message: 'Version info created successfully',
            version: newVersion,
        });
    } catch (error) {
        console.error('Error creating version info:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/app-version - Get all version records (admin only)
router.get('/', async (req, res) => {
    try {
        const versions = await AppVersion.find().sort({ createdAt: -1 });
        res.json(versions);
    } catch (error) {
        console.error('Error fetching versions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
