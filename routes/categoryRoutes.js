const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const router = express.Router();
const services = require("../services/categoryServices");

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now());
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        cb(null, true);
    } 
}).single('File');

router.get("/", async (req, res, next) => {
  try {
    const categories = await services.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error(`Error while getting categories`, error.message);
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid categoryId' });
    }

    const category = await services.getCategoryById(categoryId);
    res.json(category);
  } catch (error) {
    console.error('Error while fetching category by ID:', error);
    next(error);
  }
});

router.post('/', async function(req, res, next) {
  try {
      res.json(await services.createCategory(req.body));
  } catch (error) {
      console.error(`Error while creating category`, error.message);
      next(error);
  }
});

router.put('/:id', async function(req, res, next) {
  try {
      res.json(await services.updateCategory(req.params.id, req.body));
  } catch (error) {
      console.error(`Error while updating category`, error.message);
      next(error);
  }
});

router.delete('/:id', async function(req, res, next) {
  try {
    res.json(await services.deleteCategory(req.params.id));
  } catch (error) {
    console.error(`Error while deleting category`, error.message);
    next(error);
  }
});

router.post('/upload', function (req, res, next) {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to upload file', details: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const categories = xlsx.utils.sheet_to_json(sheet);

      const validCategories = categories.filter(category => category.category_name && category.category_img);

      if (validCategories.length > 0) {
        await services.bulkCreateCategories(validCategories);
        res.json({ message: 'Categories uploaded successfully', categories: validCategories });
      } else {
        res.status(400).json({ error: 'No valid categories found in the uploaded file' });
      }

      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

router.get("/export/excel", async (req, res, next) => {
  try {
    const buffer = await services.exportCategoriesToExcel();
    res.setHeader("Content-Disposition", "attachment; filename=categories.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Error while exporting categories to Excel:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
