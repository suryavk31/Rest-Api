const express = require("express");
const router = express.Router();
const subSubCategoryServices = require("../services/subSubCategoryServices");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");

// Configure Multer storage for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Specify the destination directory for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep the original filename
  },
});

// Initialize Multer
const upload = multer({ storage: storage }).single("file");

// Upload sub-sub-categories from Excel sheet
router.post("/upload", (req, res, next) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(500).json({ error: "Failed to upload file", details: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const filePath = req.file.path;
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const subSubCategories = xlsx.utils.sheet_to_json(sheet);

      subSubCategoryServices.bulkCreateSubSubCategories(subSubCategories)
        .then(() => {
          res.json({ message: "Sub-sub-categories uploaded successfully" });
          fs.unlinkSync(filePath); // Delete the file after processing
        })
        .catch(error => {
          console.error("Error creating sub-sub-categories from Excel:", error);
          res.status(500).json({ error: "Internal server error" });
        });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

// Get all sub-sub-categories
router.get("/", async (req, res, next) => {
  try {
    const subSubCategories = await subSubCategoryServices.getAllSubSubCategories();
    res.json(subSubCategories);
  } catch (error) {
    console.error(`Error while getting sub-sub-categories`, error.message);
    next(error);
  }
});

// Create a new sub-sub-category
router.post("/", async (req, res, next) => {
  try {
    const subSubCategory = req.body;
    const result = await subSubCategoryServices.createSubSubCategory(subSubCategory);
    res.json(result);
  } catch (error) {
    console.error(`Error while creating sub-sub-category`, error.message);
    next(error);
  }
});

// Get a sub-sub-category by ID
router.get("/:id", async (req, res, next) => {
  try {
    const subSubCategoryId = req.params.id;
    const subSubCategory = await subSubCategoryServices.getSubSubCategoryById(subSubCategoryId);
    res.json(subSubCategory);
  } catch (error) {
    console.error(`Error while getting sub-sub-category by ID`, error.message);
    next(error);
  }
});

// Update a sub-sub-category
router.put("/:id", async (req, res, next) => {
  try {
    const subSubCategoryId = req.params.id;
    const subSubCategory = req.body;
    const result = await subSubCategoryServices.updateSubSubCategory(subSubCategoryId, subSubCategory);
    res.json(result);
  } catch (error) {
    console.error(`Error while updating sub-sub-category`, error.message);
    next(error);
  }
});

// Delete a sub-sub-category
router.delete("/:id", async (req, res, next) => {
  try {
    const subSubCategoryId = req.params.id;
    const result = await subSubCategoryServices.deleteSubSubCategory(subSubCategoryId);
    res.json(result);
  } catch (error) {
    console.error(`Error while deleting sub-sub-category`, error.message);
    next(error);
  }
});

// get sub sub category by sub category name
router.get("/subCategory/:subCategoryName", async (req, res, next) => {
  try {
    const subCategoryName = req.params.subCategoryName;
    const subSubCategories = await subSubCategoryServices.getSubSubCategoryBySubCategoryName(subCategoryName);
    res.json(subSubCategories);
  } catch (error) {
    console.error(`Error while fetching sub category by sub sub category`, error.message);
    next(error)
  }
})

// export sub sub categories to excel
router.get("/export/excel", async (req, res, next) => {
  try {
    const buffer = await subSubCategoryServices.exportSubSubCategoriesToExcel();
    res.setHeader("Content-Disposition", "attachment; filename=sub_sub_categories.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Error while exporting sub-sub-categories to Excel:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
