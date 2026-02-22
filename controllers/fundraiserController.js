const Fundraiser = require("../models/Fundraiser");

// Get active fundraiser (public — for the app)
exports.getActiveFundraiser = async (req, res) => {
    try {
        const fundraiser = await Fundraiser.findOne({ isActive: true }).sort({ updatedAt: -1 });
        if (!fundraiser) {
            return res.status(200).json(null);
        }
        res.status(200).json(fundraiser);
    } catch (error) {
        console.error("Error fetching active fundraiser:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get all fundraisers (admin)
exports.getAllFundraisers = async (req, res) => {
    try {
        const fundraisers = await Fundraiser.find().sort({ updatedAt: -1 });
        res.status(200).json(fundraisers);
    } catch (error) {
        console.error("Error fetching fundraisers:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create fundraiser (admin)
exports.createFundraiser = async (req, res) => {
    try {
        const { name, buttonLabel, description, goalAmount, raisedAmount, breakdownItems, paymentNote, isActive, accentColor } = req.body;

        // If this fundraiser is being set to active, deactivate all others
        if (isActive) {
            await Fundraiser.updateMany({}, { isActive: false });
        }

        const fundraiser = await Fundraiser.create({
            name,
            buttonLabel,
            description,
            goalAmount,
            raisedAmount: raisedAmount || 0,
            breakdownItems: breakdownItems || [],
            paymentNote,
            isActive: isActive || false,
            accentColor: accentColor || "#CDA343",
        });

        res.status(201).json(fundraiser);
    } catch (error) {
        console.error("Error creating fundraiser:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update fundraiser (admin)
exports.updateFundraiser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // If this fundraiser is being set to active, deactivate all others
        if (updateData.isActive) {
            await Fundraiser.updateMany({ _id: { $ne: id } }, { isActive: false });
        }

        const fundraiser = await Fundraiser.findByIdAndUpdate(id, updateData, { new: true });

        if (!fundraiser) {
            return res.status(404).json({ message: "Fundraiser not found" });
        }

        res.status(200).json(fundraiser);
    } catch (error) {
        console.error("Error updating fundraiser:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete fundraiser (admin)
exports.deleteFundraiser = async (req, res) => {
    try {
        const { id } = req.params;
        const fundraiser = await Fundraiser.findByIdAndDelete(id);

        if (!fundraiser) {
            return res.status(404).json({ message: "Fundraiser not found" });
        }

        res.status(200).json({ message: "Fundraiser deleted" });
    } catch (error) {
        console.error("Error deleting fundraiser:", error);
        res.status(500).json({ message: "Server error" });
    }
};
