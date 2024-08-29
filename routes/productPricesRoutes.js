const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const productPricesServices = require("../services/productPricesServices");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + '.xlsx');
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
      const productPrices = await productPricesServices.getAllProductPrices();
      res.json(productPrices);
    } catch (error) {
      console.error(`Error while getting Product Prices`, error.message);
      next(error);
    }
  });

router.post('/', async (req, res) => {
    try {
        const result = await productPricesServices.createProductPrice(req.body);
        res.json(result);
    } catch (error) {
        console.error('Error creating product price:', error);
        res.status(500).json({ error: 'Failed to create product price' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const productPrice = await productPricesServices.getProductPriceById(id);
        res.json(productPrice);
    } catch (error) {
        console.error('Error fetching product price by ID:', error);
        res.status(500).json({ error: 'Failed to fetch product price' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await productPricesServices.updateProductPrice(id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error updating product price:', error);
        res.status(500).json({ error: 'Failed to update product price' });
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

      const productPrices = xlsx.utils.sheet_to_json(sheet);

      const validProductPrices = productPrices.filter(price => price.product_id && price.location_id && price.price && price.delivery_option);

      if (validProductPrices.length > 0) {
        await productPricesServices.bulkCreateProductPrices(validProductPrices);
        res.json({ message: 'Product prices uploaded successfully', productPrices: validProductPrices });
      } else {
        res.status(400).json({ error: 'No valid product prices found in the uploaded file' });
      }

      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await productPricesServices.deleteProductPrice(id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting product price:', error);
        res.status(500).json({ error: 'Failed to delete product price' });
    }
});

module.exports = router;
