const db = require('./db');

async function getAllProductPrices() {
    try {
        const query = `
            SELECT pp.id, pp.product_id, pp.location_id, pp.price, pp.delivery_option, 
                   p.product_name, l.location_name
            FROM product_prices pp
            INNER JOIN product p ON pp.product_id = p.Product_id
            INNER JOIN locations l ON pp.location_id = l.id
        `;
        const productPrices = await db.query(query);
        return productPrices;
    } catch (error) {
        console.error('Error in getAllProductPrices:', error);
        throw error; // Throw the error to be handled by the caller
    }
}

async function createProductPrice(productPrice) {
    const { product_id, location_id, price, delivery_option } = productPrice;
    const query = 'INSERT INTO product_prices (product_id, location_id, price, delivery_option) VALUES (?, ?, ?, ?)';
    try {
        await db.query(query, [product_id, location_id, price, delivery_option]);
        return { message: 'Product price created successfully' };
    } catch (error) {
        console.error('Error creating product price:', error);
        throw error;
    }
}

async function bulkCreateProductPrices(productPrices) {
    if (productPrices.length === 0) {
      return { message: "No product prices to create" };
    }
  
    const query =
      "INSERT INTO product_prices (product_id, location_id, price, delivery_option) VALUES " +
      productPrices.map(() => "(?, ?, ?, ?)").join(", ");
  
    const values = productPrices.reduce((acc, price) => {
      acc.push(price.product_id, price.location_id, price.price, price.delivery_option);
      return acc;
    }, []);
  
    try {
      await db.query(query, values);
      return { message: "Product prices created successfully" };
    } catch (error) {
      console.error("Error in bulkCreateProductPrices:", error);
      throw error; // Propagate the error to the caller
    }
  }

async function getProductPriceById(productPriceId) {
    const query = 'SELECT * FROM product_prices WHERE id = ?';
    try {
        const rows = await db.query(query, [productPriceId]);
        return rows[0];
    } catch (error) {
        console.error('Error fetching product price by ID:', error);
        throw error;
    }
}

async function updateProductPrice(productPriceId, productPrice) {
    const { price, delivery_option } = productPrice;
    const query = 'UPDATE product_prices SET price = ?, delivery_option = ? WHERE id = ?';
    try {
        await db.query(query, [price, delivery_option, productPriceId]);
        return { message: 'Product price updated successfully' };
    } catch (error) {
        console.error('Error updating product price:', error);
        throw error;
    }
}

async function deleteProductPrice(productPriceId) {
    const query = 'DELETE FROM product_prices WHERE id = ?';
    try {
        await db.query(query, [productPriceId]);
        return { message: 'Product price deleted successfully' };
    } catch (error) {
        console.error('Error deleting product price:', error);
        throw error;
    }
}

module.exports = {
    createProductPrice,
    getProductPriceById,
    updateProductPrice,
    deleteProductPrice,
    bulkCreateProductPrices,
    getAllProductPrices,
};
