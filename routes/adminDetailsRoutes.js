const express = require("express");
const { getAllAdminDetails, createAdminDetails, updateAdminDetails } = require("../controllers/adminDetailsController");

const router = express.Router();

router.get("/", getAllAdminDetails);
router.post("/add", createAdminDetails);
router.put("/update", updateAdminDetails);

module.exports = router;
