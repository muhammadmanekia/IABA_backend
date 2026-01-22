const mongoose = require("mongoose");

const membershipsSchema = new mongoose.Schema({
  fullName: { type: String },
  spouseFullName: { type: String },
  email: { type: String },
  cellPhone: { type: String },
  homeAddress: { type: String },
  dob: { type: String },
  maritalStatus: { type: String },
  numChildren: { type: Number },
  childrenInfo: [
    {
      name: { type: String },
      dob: { type: String },
    },
  ],
  membershipType: { type: String },
  agreedToConstitution: { type: Boolean },
  comment: { type: String },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "Memberships",
  membershipsSchema,
  "memberships"
);
