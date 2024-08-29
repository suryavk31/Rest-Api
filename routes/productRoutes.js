// your main file (e.g., productRoutes.js)
const express = require('express');
const router = express.Router();
const services = require('../services/productServices');
const db = require('../services/db_odbc'); // Use the ODBC db module
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');

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

// Route for filtering products
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
        console.error('Error while filtering products:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route for fetching all products
router.get("/", async (req, res, next) => {
    try {
        const products = await services.getAllProducts();
        res.json(products);
    } catch (error) {
        console.error(`Error while getting products:`, error.message);
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
        console.error(`Error fetching products by category:`, error.message);
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
        console.error(`Error fetching products by sub-category:`, error.message);
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
        console.error(`Error fetching products by sub-sub-category:`, error.message);
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
        
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        console.error('Error while fetching product by ID:', error);
        next(error);
    }
});

// Route for fetching product price by location
router.get('/:productId/price', async (req, res, next) => {
  const productId = req.params.productId;
  const pinCode = req.query.pinCode;  // Assuming pin code is passed as a query parameter

  console.log(`Received request for productId: ${productId}, pinCode: ${pinCode}`);

  const findLocationQuery = `
    SELECT id AS location_id
    FROM locations
    WHERE pin_codes LIKE CONCAT('%', ?, '%')
  `;

  const productPriceQuery = 'SELECT price, delivery_option FROM product_prices WHERE product_id = ? AND location_id = ?';
  const productMRPQuery = 'SELECT MRP, delivery_option FROM product WHERE Product_id = ?';

  try {
    let priceResult, deliveryOption;

    // Query location_id from locations table based on pin_code
    const locationResult = await db.query(findLocationQuery, [pinCode]);

    if (locationResult.length === 0) {
      console.log(`No location found for pinCode: ${pinCode}`);
      // Fetch MRP and default delivery option from product table if no specific location found
      const mrpResults = await db.query(productMRPQuery, [productId]);

      if (mrpResults.length > 0) {
        console.log('MRP found:', mrpResults[0].MRP);
        priceResult = mrpResults[0].MRP;
        deliveryOption = mrpResults[0].delivery_option;
      } else {
        console.log('Product not found');
        return res.json({ price: null });
      }
    } else {
      const locationId = locationResult[0].location_id;

      // Query product price based on product_id and location_id
      const priceResults = await db.query(productPriceQuery, [productId, locationId]);

      if (priceResults.length > 0) {
        console.log('Price found:', priceResults[0].price);
        priceResult = priceResults[0].price;
        deliveryOption = priceResults[0].delivery_option;
      } else {
        // If no specific price found for the location, fetch MRP and default delivery option
        const mrpResults = await db.query(productMRPQuery, [productId]);

        if (mrpResults.length > 0) {
          console.log('MRP found:', mrpResults[0].MRP);
          priceResult = mrpResults[0].MRP;
          deliveryOption = mrpResults[0].delivery_option;
        } else {
          console.log('Product not found');
          return res.json({ price: null });
        }
      }
    }

    res.json({ price: priceResult, delivery_option: deliveryOption });
  } catch (err) {
    console.error('Error executing query:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route for uploading products via Excel file
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
            const products = xlsx.utils.sheet_to_json(sheet);

            let errorOccurred = false;

            for (const product of products) {
                try {
                    // Parse variablePrices from string to JSON array
                    if (product.variablePrices && typeof product.variablePrices === 'string') {
                        product.variablePrices = JSON.parse(product.variablePrices);
                    }

                    await services.createProducts(product);
                } catch (error) {
                    console.error('Error creating product:', error);
                    errorOccurred = true;
                    break; // Stop processing on first error
                }
            }

            if (errorOccurred) {
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.json({ message: 'Products uploaded successfully', products });
            }

            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Error reading Excel file:', error);
            fs.unlinkSync(filePath);
            res.status(500).json({ error: 'Failed to process Excel file', details: error.message });
        }
    });
});

router.get('/search', async (req, res, next) => {
    try {
        const query = req.query.q; // The search term from the query parameter
        console.log(`Searching for products with query: ${query}`);

        const products = await services.searchProducts(query);

        if (products.length === 0) {
            return res.status(404).json({ message: "No products found" });
        }

        res.status(200).json(products);
    } catch (error) {
        console.error('Error while searching products:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
