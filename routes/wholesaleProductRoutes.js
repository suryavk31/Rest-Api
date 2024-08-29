const express = require("express");
const router = express.Router();
const services = require("../services/wholeSaleProductServices");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");

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

router.get('/filter', async (req, res) => {
  try {
      const filters = {
          category: req.query.category,
          subCategory: req.query.subCategory,
          subSubCategory: req.query.subSubCategory,
          minPrice: parseFloat(req.query.minPrice),
          maxPrice: parseFloat(req.query.maxPrice)
      };

      console.log('Filters:', filters); // Log filters for debugging

      const products = await services.getFilteredProducts(filters);

      if (products.length === 0) {
          return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json(products);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});


// Route for fetching all products
router.get("/", async (req, res, next) => {
  try {
    const products = await services.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error(`Error while getting products`, error.message);
    next(error);
  }
});


// Route for fetching products by category
router.get("/category/:category", async (req, res, next) => {
  try {
      const category = req.params.category;
      const products = await services.getProductsByCategory(category);
      res.json(products);
  } catch (error) {
      console.error(`Error fetching products by category`, error.message);
      next(error);
  }
});

// Route for fetching products by sub-category
router.get("/subcategory/:subCategory", async (req, res, next) => {
  try {
      const subCategory = req.params.subCategory;
      const products = await services.getProductsBySubCategory(subCategory);
      res.json(products);
  } catch (error) {
      console.error(`Error fetching products by sub-category`, error.message);
      next(error);
  }
});

// Route for fetching products by sub-sub-category
router.get("/subsubcategory/:subSubCategory", async (req, res, next) => {
  try {
      const subSubCategory = req.params.subSubCategory;
      const products = await services.getProductsBySubSubCategory(subSubCategory);
      res.json(products);
  } catch (error) {
      console.error(`Error fetching products by sub-sub-category`, error.message);
      next(error);
  }
});

// Route for fetching a product by ID
router.get("/:id", async (req, res, next) => {
  try {
      const productId = req.params.id;
      console.log(`Fetching product with ID: ${productId}`);
      
      const product = await services.getProductById(productId);
      console.log(`Product details: ${JSON.stringify(product)}`);
      
      res.json(product);
  } catch (error) {
      console.error('Error while fetching product by ID:', error);
      next(error);
  }
});


// Route for fetching product price by location
router.get('/:productId/price', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const locationId = parseInt(req.query.locationId);

    console.log(`Received request for productId: ${productId}, locationId: ${locationId}`);

    if (isNaN(productId) || isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid productId or locationId' });
    }

    const result = await services.getProductPriceByLocation(productId, locationId);
    console.log('Result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error while fetching product price by location:', error);
    next(error);
  }
});

// Route for uploading products via Excel file
router.post('/upload', function (req, res, next) {
    upload(req, res, function (err) {
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
            const products = xlsx.utils.sheet_to_json(sheet);

            let errorOccurred = false;

            products.forEach(async (product) => {
                try {
                    await services.createProducts(product);
                } catch (error) {
                    console.error('Error creating product:', error);
                    errorOccurred = true;
                }
            });

            if (errorOccurred) {
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.json({ message: 'WholeSale Product uploaded successfully', products });
            }

            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Error processing Excel file:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// Route for creating a product
router.post('/', async function(req, res, next) {
  try {
      res.json(await services.createProducts(req.body));
  } catch (error) {
      console.error(`Error while creating WholeSale Product`, error.message);
      next(error);
  }
});

// Route for updating a product
router.put('/:id', async function(req, res, next) {
  try {
      res.json(await services.updateProduct(req.params.id, req.body));
  } catch (error) {
      console.error(`Error while updating WholeSale Product`, error.message);
      next(error);
  }
});

// Route for deleting a product
router.delete('/:id', async function(req, res, next) {
  try {
    res.json(await services.removeProduct(req.params.id));
  } catch (error) {
    console.error(`Error while deleting WholeSale Product`, error.message);
    next(error);
  }
});



module.exports = router;
