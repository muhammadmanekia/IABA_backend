const mongoose = require("mongoose");

const fundraiserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        buttonLabel: {
            type: String,
            default: "Fundraiser",
        },
        description: {
            type: String,
            default: "",
        },
        goalAmount: {
            type: Number,
            required: true,
        },
        raisedAmount: {
            type: Number,
            default: 0,
        },
        breakdownItems: [
            {
                label: { type: String, required: true },
                amount: { type: Number, required: true },
            },
        ],
        paymentNote: {
            type: String,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        accentColor: {
            type: String,
            default: "#CDA343",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Fundraiser", fundraiserSchema, "fundraisers");
