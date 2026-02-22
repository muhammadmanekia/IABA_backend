const express = require("express");
const router = express.Router();
const fundraiserController = require("../controllers/fundraiserController");

// Public
router.get("/active", fundraiserController.getActiveFundraiser);

// Admin
router.get("/", fundraiserController.getAllFundraisers);
router.post("/", fundraiserController.createFundraiser);
router.put("/:id", fundraiserController.updateFundraiser);
router.delete("/:id", fundraiserController.deleteFundraiser);

module.exports = router;
