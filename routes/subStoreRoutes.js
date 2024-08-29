const express = require("express");
const { addSubStore, updateSubStore, deleteSubStore, getAllStore, getSubStoreByStoreId } = require("../controllers/subStoreController");

const router = express.Router();

router.get("/", getAllStore);
router.get("/:store_id", getSubStoreByStoreId)
router.post("/add", addSubStore);
router.put("/update", updateSubStore);
router.delete("/remove/:id", deleteSubStore);

module.exports = router;
