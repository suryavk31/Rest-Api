const db = require("./db");
const helper = require("../helper");
const config = require("../config");
const ImageKit = require("imagekit");

const imagekit = new ImageKit({
    publicKey: 'public_1YMyhTOs7XfdFkKoBT6Kd6RCcUY=',
    privateKey: 'private_VGcK19i8Dvbqq6V9+gKYAPbr9sM=',
    urlEndpoint: 'https://ik.imagekit.io/efsdltq0e',
});

const getFilteredProducts = async (filters) => {
    const { category, subCategory, subSubCategory, minPrice, maxPrice } = filters;

    let query = 'SELECT * FROM wholesale_products WHERE 1=1';
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
    const rows = await db.query("SELECT * FROM wholesale_products");
    return rows;
  }


  async function createProducts(products) {
    const imageUrls = [];
    const imageKeys = ['Prodouct_img_0', 'Prodouct_img_1', 'Prodouct_img_2', 'Prodouct_img_3', 'Prodouct_img_4'];

    for (const key of imageKeys) {
        if (products[key]) {
            try {
                const response = await imagekit.upload({
                    file: products[key],
                    fileName: `products_${Date.now()}_${key}`,
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

    const expDate = new Date(products.exp_date);
    const formattedExpDate = expDate.toISOString().slice(0, 10);

    const query = `
        INSERT INTO wholesale_products 
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
            Size, 
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
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        wholesale_products.Product_id,            
        wholesale_products.Categories,
        wholesale_products.Sub_Categories,
        wholesale_products.Sub_Sub_Categories,
        wholesale_products.Brand_name,
        wholesale_products.Product_name,
        imageUrls[0],
        imageUrls[1],
        imageUrls[2],
        imageUrls[3],
        imageUrls[4],
        wholesale_products.Weight,
        wholesale_products.Size,
        wholesale_products.MRP,
        wholesale_products.sell_price,
        wholesale_products.offer,
        wholesale_products.you_save,
        wholesale_products.kind,
        formattedExpDate,
        wholesale_products.About_Product,
        wholesale_products.Benefits,
        wholesale_products.Storage_and_Uses
    ];

    try {
        const result = await db.query(query, values);
        const productId = result.insertId;

        if (wholesale_products.variablePrices) {
            for (const price of wholesale_products.variablePrices) {
                await db.query(
                    'INSERT INTO wholesale_products_variable_prices (product_id, unit, price) VALUES (?, ?, ?)',
                    [productId, price.unit, price.price]
                );
            }
        }

        return { message: 'Wholesale Product created successfully' };
    } catch (error) {
        console.error('Error creating product:', error);
        return { message: 'Error creating product' };
    }
}

async function getProductPriceByLocation(productId, locationId) {
    try {
        console.log(`Fetching price for productId: ${productId}, locationId: ${locationId}`);

        const rows = await db.query(
            'SELECT price FROM product_prices WHERE product_id = ? AND location_id = ?',
            [productId, locationId]
        );

        console.log('Query Results:', rows);

        if (Array.isArray(rows) && rows.length > 0) {
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
            'SELECT * FROM wholesale_products WHERE Product_id = ?',
            [productId.toString()]  // Ensure productId is treated as a string
        );

        const priceRows = await db.query(
            'SELECT unit, price FROM wholesale_products_variable_prices WHERE product_id = ?',
            [productId.toString()]  // Ensure productId is treated as a string
        );

        const product = helper.emptyOrRows(productRows)[0];

        if (!product) {
            // Return an appropriate message or throw an error if the product is not found
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
                    fileName: `products_${id}_${i}`,
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
            `UPDATE wholesale_products 
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
                Size=?, 
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
                wholesale_products.Product_id,
                wholesale_products.Categories,
                wholesale_products.Sub_Categories,
                wholesale_products.Sub_Sub_Categories,
                wholesale_products.Brand_name,
                wholesale_products.Product_name,
                imageUrls[0], // Use image URLs instead of image data
                imageUrls[1],
                imageUrls[2],
                imageUrls[3],
                imageUrls[4],
                wholesale_products.Weight,
                wholesale_products.Size,
                wholesale_products.MRP,
                wholesale_products.sell_price,
                wholesale_products.offer,
                wholesale_products.you_save,
                wholesale_products.kind,
                expDate,
                wholesale_products.About_Product,
                wholesale_products.Benefits,
                wholesale_products.Storage_and_Uses,
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

        return { message: 'Wholesale Products updated successfully' };
    } catch (error) {
        console.error('Error updating product:', error);
        return { message: 'Error updating product' };
    }
}


async function removeProduct(id) {
    try {
        const result = await db.query(
            `DELETE FROM wholesale_products WHERE Product_id = ?`,
            [id]
        );
        if (result.affectedRows) {
            return { message: "Wholesale Products deleted successfully" };
        } else {
            return { message: "Error in deleting product" };
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        return { message: 'Error deleting product' };
    }
}
async function getProductsByCategory(category) {
    const query = 'SELECT * FROM wholesale_products WHERE Categories = ?';
    const rows = await db.query(query, [category]);
    return rows;
}

async function getProductsBySubCategory(subCategory) {
    const query = 'SELECT * FROM wholesale_products WHERE Sub_Categories = ?';
    const rows = await db.query(query, [subCategory]);
    return rows;
}

async function getProductsBySubSubCategory(subSubCategory) {
    const query = 'SELECT * FROM wholesale_products WHERE Sub_Sub_Categories = ?';
    const rows = await db.query(query, [subSubCategory]);
    return rows;
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
    getFilteredProducts
};
