const db = require("./db");
const helper = require("../helper");
const config = require("../config");
const ImageKit = require("imagekit");
const xlsx = require("xlsx")

const imagekit = new ImageKit({
    publicKey: 'public_1YMyhTOs7XfdFkKoBT6Kd6RCcUY=',
    privateKey: 'private_VGcK19i8Dvbqq6V9+gKYAPbr9sM=',
    urlEndpoint: 'https://ik.imagekit.io/efsdltq0e',
});

const getFilteredProducts = async (filters) => {
    const { category, subCategory, subSubCategory, minPrice, maxPrice } = filters;

    let query = 'SELECT * FROM product WHERE 1=1';
    let queryParams = [];

    if (category) {
        query += ' AND Categories = ?';
        queryParams.push(category);
    }

    if (subCategory) {
        query += ' AND Sub_Categories = ?';
        queryParams.push(subCategory);
    }

    if (subSubCategory) {
        query += ' AND Sub_Sub_Categories = ?';
        queryParams.push(subSubCategory);
    }

    if (minPrice) {
        query += ' AND sell_price >= ?';
        queryParams.push(minPrice);
    }

    if (maxPrice) {
        query += ' AND sell_price <= ?';
        queryParams.push(maxPrice);
    }

    try {
        const results = await db.query(query, queryParams);
        return results;
    } catch (error) {
        console.error('Database Error:', error);
        throw error;
    }
};

async function getAllProducts() {
    const rows = await db.query("SELECT * FROM product");
    return rows;
}

async function createProducts(product) {
    const imageUrls = [];
    const imageKeys = ['Prodouct_img_0', 'Prodouct_img_1', 'Prodouct_img_2', 'Prodouct_img_3', 'Prodouct_img_4'];

    // Upload images and get URLs
    for (const key of imageKeys) {
        if (product[key]) {
            try {
                const response = await imagekit.upload({
                    file: product[key],
                    fileName: `product_${Date.now()}_${key}`,
                    folder: 'product_images'
                });
                imageUrls.push(response.url);
            } catch (error) {
                console.error(`Error uploading image (${key}):`, error);
                return { message: `Error uploading image: ${key}` };
            }
        } else {
            imageUrls.push(null);
        }
    }

    const expDate = new Date(product.exp_date).toISOString().slice(0, 10);

    // Insert into product table (not products)
    const queryProduct = `
        INSERT INTO product 
        (
            Product_id,
            Categories, 
            Sub_Categories, 
            Sub_Sub_Categories, 
            Brand_name, 
            Product_name, 
            Prodouct_img_0, 
            Prodouct_img_1, 
            Prodouct_img_2, 
            Prodouct_img_3, 
            Prodouct_img_4, 
            Weight, 
            MRP, 
            sell_price, 
            offer, 
            you_save, 
            kind, 
            exp_date, 
            About_Product, 
            Benefits, 
            Storage_and_Uses
        ) 
        VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valuesProduct = [
        product.Product_id, // Use provided product_id
        product.Categories,
        product.Sub_Categories,
        product.Sub_Sub_Categories,
        product.Brand_name,
        product.Product_name,
        imageUrls[0],
        imageUrls[1],
        imageUrls[2],
        imageUrls[3],
        imageUrls[4],
        product.Weight,
        product.MRP,
        product.sell_price,
        product.offer,
        product.you_save,
        product.kind,
        expDate,
        product.About_Product,
        product.Benefits,
        product.Storage_and_Uses
    ];

    try {
        // Insert into product table
        await db.query(queryProduct, valuesProduct);

        // Insert variable prices if available
        if (product.variablePrices && product.variablePrices.length > 0) {
            for (const price of product.variablePrices) {
                try {
                    await db.query(
                        'INSERT INTO product_variable_prices (product_id, unit, price) VALUES (?, ?, ?)',
                        [product.Product_id, price.unit, price.price]
                    );
                } catch (error) {
                    console.error('Error inserting into product_variable_prices:', error);
                    throw error; // Rethrow the error to handle it appropriately
                }
            }
        }

        return { message: 'Product uploaded successfully', productId: product.Product_id };
    } catch (error) {
        console.error('Error creating product:', error);
        throw error;
    }
}


async function getProductPriceByLocation(productId, locationId) {
    try {
        console.log(`Fetching price for productId: ${productId}, locationId: ${locationId}`);

        const query = `
            SELECT price
            FROM product_prices
            WHERE product_id = ? AND location_id = ?
        `;
        const [rows] = await db.query(query, [productId, locationId]);

        if (rows.length > 0) {
            console.log('Price Found:', rows[0].price);
            return { price: rows[0].price };
        } else {
            console.log('No Price Found');
            return { price: null };
        }
    } catch (error) {
        console.error('Error while fetching product price by location:', error);
        throw error;
    }
}


async function getProductById(productId) {
    try {
        const productRows = await db.query(
            'SELECT * FROM product WHERE Product_id = ?',
            [productId.toString()]
        );

        const priceRows = await db.query(
            'SELECT unit, price FROM product_variable_prices WHERE product_id = ?',
            [productId.toString()]
        );

        const product = helper.emptyOrRows(productRows)[0];

        if (!product) {
            return { message: 'Product not found' };
        }

        product.variablePrices = helper.emptyOrRows(priceRows);

        return product;
    } catch (error) {
        console.error('Error while fetching product by ID:', error);
        throw error;
    }
}

async function updateProduct(id, products) {
    const imageUrls = [];
    for (let i = 0; i < 5; i++) {
        if (products[`Prodouct_img_${i}`]) {
            try {
                const response = await imagekit.upload({
                    file: products[`Prodouct_img_${i}`],
                    fileName: `product_${id}_${i}`,
                    folder: 'product_images'
                });
                imageUrls.push(response.url);
            } catch (error) {
                console.error('Error uploading image:', error);
                return { message: 'Error uploading product images' };
            }
        } else {
            imageUrls.push(null);
        }
    }

    const expDate = new Date(products.exp_date).toISOString().slice(0, 10);

    try {
        await db.query(
            `UPDATE product 
            SET 
                Product_id=?,
                Categories=?, 
                Sub_Categories=?, 
                Sub_Sub_Categories=?, 
                Brand_name=?, 
                Product_name=?, 
                Prodouct_img_0=?, 
                Prodouct_img_1=?, 
                Prodouct_img_2=?, 
                Prodouct_img_3=?, 
                Prodouct_img_4=?, 
                Weight=?, 
                MRP=?, 
                sell_price=?, 
                offer=?, 
                you_save=?, 
                kind=?, 
                exp_date=?, 
                About_Product=?, 
                Benefits=?, 
                Storage_and_Uses=? 
            WHERE Product_id=?`,
            [
                products.Product_id,
                products.Categories,
                products.Sub_Categories,
                products.Sub_Sub_Categories,
                products.Brand_name,
                products.Product_name,
                imageUrls[0], // Use image URLs instead of image data
                imageUrls[1],
                imageUrls[2],
                imageUrls[3],
                imageUrls[4],
                products.Weight,
                products.MRP,
                products.sell_price,
                products.offer,
                products.you_save,
                products.kind,
                expDate,
                products.About_Product,
                products.Benefits,
                products.Storage_and_Uses,
                id
            ]
        );

        if (products.variablePrices) {
            await db.query('DELETE FROM product_variable_prices WHERE product_id = ?', [id]);
            for (const price of products.variablePrices) {
                await db.query(
                    'INSERT INTO product_variable_prices (product_id, unit, price) VALUES (?, ?, ?)',
                    [id, price.unit, price.price]
                );
            }
        }

        return { message: 'Product updated successfully' };
    } catch (error) {
        console.error('Error updating product:', error);
        return { message: 'Error updating product' };
    }
}

async function removeProduct(id) {
    try {
        const result = await db.query(
            `DELETE FROM product WHERE Product_id = ?`,
            [id]
        );
        if (result.affectedRows) {
            return { message: "Product deleted successfully" };
        } else {
            return { message: "Error in deleting product" };
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        return { message: 'Error deleting product' };
    }
}

async function getProductsByCategory(category) {
    const query = 'SELECT * FROM product WHERE Categories = ?';
    const rows = await db.query(query, [category]);
    return rows;
}

async function getProductsBySubCategory(subCategory) {
    const query = 'SELECT * FROM product WHERE Sub_Categories = ?';
    const rows = await db.query(query, [subCategory]);
    return rows;
}

async function getProductsBySubSubCategory(subSubCategory) {
    const query = 'SELECT * FROM product WHERE Sub_Sub_Categories = ?';
    const rows = await db.query(query, [subSubCategory]);
    return rows;
}

  async function exportProducts() {
    try {
        const rows = await db.query("SELECT * FROM product");
        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "product");
        const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
        return excelBuffer;
    } catch (error) {
        console.error(`Error while export products`, error.message);
    }
  }

  async function searchProducts(query) {
    try {
        // Sanitize input to prevent SQL injection
        const sanitizedQuery = `%${query}%`;
        
        // Query to search for products where product_name contains the search term
        const searchQuery = `
            SELECT * 
            FROM product 
            WHERE Product_name LIKE ?
        `;
        
        // Execute the query
        const results = await db.query(searchQuery, [sanitizedQuery]);
        return results;
    } catch (error) {
        console.error('Error while searching products:', error);
        throw error;
    }
}

module.exports = {
    getAllProducts,
    createProducts,
    updateProduct,
    removeProduct,
    getProductPriceByLocation,
    getProductById,
    getProductsByCategory,
    getProductsBySubCategory,
    getProductsBySubSubCategory,
    getFilteredProducts,
    exportProducts,
    searchProducts
};
