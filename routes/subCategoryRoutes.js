const express = require("express");
const router = express.Router();
const subCategoryServices = require("../services/subCategoryServices");
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

// Upload sub-categories from Excel sheet
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
      const subCategories = xlsx.utils.sheet_to_json(sheet);

      subCategoryServices.bulkCreateSubCategories(subCategories)
        .then(result => {
          res.json(result);
        })
        .catch(error => {
          console.error(`Error creating sub-categories from Excel:`, error);
          res.status(500).json({ error: "Internal server error" });
        })
        .finally(() => {
          fs.unlinkSync(filePath);
        });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

// Get all sub-categories
router.get("/", async (req, res, next) => {
  try {
    const subCategories = await subCategoryServices.getAllSubCategories();
    res.json(subCategories);
  } catch (error) {
    console.error(`Error while getting sub-categories`, error.message);
    next(error);
  }
});

// Create a new sub-category
router.post("/", async (req, res, next) => {
  try {
    const { sub_category_name, sub_category_img } = req.body;
    if (!sub_category_name) {
      return res.status(400).json({ error: "Sub-category name is required" });
    }
    const result = await subCategoryServices.createSubCategory({ sub_category_name, sub_category_img });
    res.json(result);
  } catch (error) {
    console.error(`Error while creating sub-category`, error.message);
    next(error);
  }
});

// Get a sub-category by ID
router.get("/:id", async (req, res, next) => {
  try {
    const subCategoryId = req.params.id;
    const subCategory = await subCategoryServices.getSubCategoryById(subCategoryId);
    res.json(subCategory);
  } catch (error) {
    console.error(`Error while getting sub-category by ID`, error.message);
    next(error);
  }
});

// Update a sub-category
router.put("/:id", async (req, res, next) => {
  try {
    const subCategoryId = req.params.id;
    const { sub_category_name, sub_category_img } = req.body;
    if (!sub_category_name) {
      return res.status(400).json({ error: "Sub-category name is required" });
    }
    const result = await subCategoryServices.updateSubCategory(subCategoryId, { sub_category_name, sub_category_img });
    res.json(result);
  } catch (error) {
    console.error(`Error while updating sub-category`, error.message);
    next(error);
  }
});

// Delete a sub-category
router.delete("/:id", async (req, res, next) => {
  try {
    const subCategoryId = req.params.id;
    const result = await subCategoryServices.deleteSubCategory(subCategoryId);
    res.json(result);
  } catch (error) {
    console.error(`Error while deleting sub-category`, error.message);
    next(error);
  }
});

//Get sub categories by category name
router.get("/category/:categoryName", async (req, res, next) => {
  try {
    const categoryName = req.params.categoryName;
    const subCategories = await subCategoryServices.getSubCategoriesByCategoryName(categoryName);
    res.json(subCategories);
  } catch (error) {
    console.error(`Error while getting sub category by category name`, error.message)
    next(error);
  }
})

router.get("/export/excel", async (req, res, next) => {
  try {
    const buffer = await subCategoryServices.exportSubCategoriesToExcel();
    res.setHeader("Content-Disposition", "attachment; filename=sub_categories.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Error while exporting sub-categories to Excel:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
