const db = require('../services/db');
const bcycrpt = require("bcryptjs");

async function createStore(req, res) {
    const {
        id,
        name,
        owner_name,
        owner_photo,
        state,
        city_name,
        primary_location,
        sec_location_1,
        sec_location_2,
        sec_location_3,
        sec_location_4,
        sec_location_5,
        sec_location_6,
        sec_location_7,
        sec_location_8,
        sec_location_9,
        sec_location_10,
        package_fee
    } = req.body;

    const params = [
        id,
        name,
        owner_name,
        owner_photo,
        state,
        city_name,
        primary_location,
        sec_location_1,
        sec_location_2,
        sec_location_3,
        sec_location_4,
        sec_location_5,
        sec_location_6,
        sec_location_7,
        sec_location_8,
        sec_location_9,
        sec_location_10,
        package_fee
    ];

    // Replace undefined values with null
    const cleanedParams = params.map(param => param === undefined ? null : param);

    const query = `
        INSERT INTO stores 
        (id, name, owner_name, owner_photo, state, city_name, primary_location, sec_location_1, sec_location_2, sec_location_3, sec_location_4, sec_location_5, sec_location_6, sec_location_7, sec_location_8, sec_location_9, sec_location_10, package_fee) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await db.query(query, cleanedParams);
        res.status(201).json({ message: 'Store created successfully' });
    } catch (error) {
        console.error(`Error creating store: ${error.message}`);
        res.status(500).json({ error: 'Failed to create store' });
    }
}

async function enableStore(req, res) {
    const { id } = req.params;

    const query = `UPDATE stores SET is_active = TRUE WHERE id = ?`;
    const params = [id];

    try {
        const result = await db.query(query, params);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Store enabled successfully" })
            
        } else {
            res.status(404).json({ error: "Store not found" })
        }
    } catch (error) {
        console.error(`Error enabling store: ${error.message}`)
        res.status(500).json({ error: "Failed to enable store" })
    }

}

async function disableStore(req, res) {
    const { id } = req.params;
    const query = `UPDATE stores SET is_active = FALSE WHERE id = ?`;
    const params = [id]

    try {
        const result = await db.query(query, params);
        if (result.affectedRows > 0 ) {
            res.status(200).json({ message: "Store disabled successfully" })
        } else {
            res.status(404).json({ error: "Store not found" })
        }
    } catch (error) {
        console.error(`Error disabling Store: ${error.message}`);
        res.status(500).json({ error: "Failed to disable store" })
    }
}


async function getStores(req, res) {
    const query = 'SELECT * FROM stores';

    try {
        const stores = await db.query(query);
        res.json(stores);
    } catch (error) {
        console.error(`Error while fetching stores: ${error.message}`)
        res.status(500).json({ error: "Failed to fetch stores" })
    }
}

async function getStoreById(req, res) {
    const { id } = req.params;
    const query = 'SELECT * FROM stores WHERE id = ?';

    try {
        const [store] = await db.query(query);
        if (store) {
            res.json(store)            
        } else {
            res.status(400).json({ error: "Store not found" });
        }
    } catch (error) {
        console.error(`Error fetching store with id ${id}: ${error.message}`)
        res.status(500).json({ error: "Failed to fetch store" })
        
    }
}


async function getOrdersByStoreId(req, res) {
    const { store_id } = req.params; // Assuming store_id is passed as a route parameter

    const query = `
        SELECT 
            orders.order_id,
            orders.user_id,
            orders.product_id,
            orders.quantity,
            orders.total_price,
            orders.store_id,
            orders.location_id,
            orders.razorpay_order_id,
            orders.order_date,
            products.Product_name,
            products.Brand_name,
            products.kind,
            products.offer,
            products.you_save,
            products.Prodouct_img_0,
            products.MRP,
            products.sell_price,
            products.size,
            products.Categories,
            products.Sub_Categories,
            products.Sub_Sub_Categories,
            products.Weight,
            delivery_fees.primary_location_fee,
            delivery_fees.sec_location_1_fee,
            delivery_fees.sec_location_2_fee,
            delivery_fees.sec_location_3_fee,
            delivery_fees.sec_location_4_fee,
            delivery_fees.sec_location_5_fee
        FROM orders
        JOIN products ON orders.product_id = products.Product_id
        LEFT JOIN delivery_fees ON orders.location_id = delivery_fees.location_id
        WHERE orders.store_id = ?
    `;

    try {
        const orders = await db.query(query, [store_id]);
        res.json(orders);
    } catch (error) {
        console.error(`Error fetching orders for store ${store_id}: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
}



async function createDeliveryFee(req, res) {
    const {
        location_id,
        primary_location_fee,
        sec_location_1_fee,
        sec_location_2_fee,
        sec_location_3_fee,
        sec_location_4_fee,
        sec_location_5_fee
    } = req.body;

    const params = [
        location_id,
        primary_location_fee,
        sec_location_1_fee,
        sec_location_2_fee,
        sec_location_3_fee,
        sec_location_4_fee,
        sec_location_5_fee
    ];

    // Replace undefined values with null
    const cleanedParams = params.map(param => param === undefined ? null : param);

    const checkLocationQuery = 'SELECT 1 FROM locations WHERE id = ?';

    try {
        const [locationExists] = await db.query(checkLocationQuery, [location_id]);

        if (!locationExists || locationExists.length === 0) {
            return res.status(400).json({ error: 'Invalid location_id: location does not exist' });
        }

        const insertQuery = `
            INSERT INTO delivery_fees 
            (location_id, primary_location_fee, sec_location_1_fee, sec_location_2_fee, sec_location_3_fee, sec_location_4_fee, sec_location_5_fee) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(insertQuery, cleanedParams);
        res.status(201).json({ message: 'Delivery fee created successfully' });
    } catch (error) {
        console.error(`Error creating delivery fee: ${error.message}`);
        res.status(500).json({ error: 'Failed to create delivery fee' });
    }
}
async function editDeliveryFee(req, res) {
    const {
        id,
        location_id,
        primary_location_fee,
        sec_location_1_fee,
        sec_location_2_fee,
        sec_location_3_fee,
        sec_location_4_fee,
        sec_location_5_fee
    } = req.body;

    const query = `
        UPDATE delivery_fees
        SET location_id = ?,
            primary_location_fee = ?,
            sec_location_1_fee = ?,
            sec_location_2_fee = ?,
            sec_location_3_fee = ?,
            sec_location_4_fee = ?,
            sec_location_5_fee = ?
        WHERE id = ?
    `;
    const params = [
        location_id,
        primary_location_fee,
        sec_location_1_fee,
        sec_location_2_fee,
        sec_location_3_fee,
        sec_location_4_fee,
        sec_location_5_fee,
        id
    ];

    try {
        const result = await db.query(query, params);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Delivery fee updated successfully' });
        } else {
            res.status(404).json({ error: 'Delivery fee not found' });
        }
    } catch (error) {
        console.error(`Error updating delivery fee: ${error.message}`);
        res.status(500).json({ error: 'Failed to update delivery fee' });
    }
}
async function deleteDeliveryFee(req, res) {
    const { id } = req.params; // Assuming id is passed as a route parameter

    const query = `
        DELETE FROM delivery_fees
        WHERE id = ?
    `;
    const params = [id];

    try {
        const result = await db.query(query, params);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Delivery fee deleted successfully' });
        } else {
            res.status(404).json({ error: 'Delivery fee not found' });
        }
    } catch (error) {
        console.error(`Error deleting delivery fee: ${error.message}`);
        res.status(500).json({ error: 'Failed to delete delivery fee' });
    }
}
async function editStore(req, res) {
    const {
        id,
        name,
        owner_name,
        owner_photo,
        state,
        city_name,
        primary_location,
        sec_location_1,
        sec_location_2,
        sec_location_3,
        sec_location_4,
        sec_location_5,
        package_fee
    } = req.body;

    const query = `
        UPDATE stores
        SET name = ?,
            owner_name = ?,
            owner_photo = ?,
            state = ?,
            city_name = ?,
            primary_location = ?,
            sec_location_1 = ?,
            sec_location_2 = ?,
            sec_location_3 = ?,
            sec_location_4 = ?,
            sec_location_5 = ?,
            package_fee = ?
        WHERE id = ?
    `;
    const params = [
        name,
        owner_name,
        owner_photo,
        state,
        city_name,
        primary_location,
        sec_location_1,
        sec_location_2,
        sec_location_3,
        sec_location_4,
        sec_location_5,
        package_fee,
        id
    ];

    try {
        const result = await db.query(query, params);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Store updated successfully' });
        } else {
            res.status(404).json({ error: 'Store not found' });
        }
    } catch (error) {
        console.error(`Error updating store: ${error.message}`);
        res.status(500).json({ error: 'Failed to update store' });
    }
}
async function deleteStore(req, res) {
    const { id } = req.params; // Assuming id is passed as a route parameter

    const query = `
        DELETE FROM stores
        WHERE id = ?
    `;
    const params = [id];

    try {
        const result = await db.query(query, params);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Store deleted successfully' });
        } else {
            res.status(404).json({ error: 'Store not found' });
        }
    } catch (error) {
        console.error(`Error deleting store: ${error.message}`);
        res.status(500).json({ error: 'Failed to delete store' });
    }
}

async function storeLogin(req, res) {
    try {
        const { id, password } = req.body;
        if (!id || !password) {
            return res.status(400).send({ error: "Store Id and password are required" });
        }

        const sql = "SELECT * FROM stores WHERE id = ?";
        const rows = await db.query(sql, [id]);

        if (rows.length === 0) {
            return res.status(400).send({ error: "Invalid Store Id or password" });
        }

        const storeAdmin = rows[0];

        // Compare the provided password with the password from the database
        if (password !== storeAdmin.password) {
            return res.status(400).send({ error: "Invalid Store Id or password" });
        }

        // Send store admin details without password
        const { password: _, ...storeAdminDetails } = storeAdmin;
        
        res.send({ storeAdmin: storeAdminDetails });
    } catch (error) {
        console.error("Error during store admin login:", error);
        res.status(500).send({ error: error.message });
    }
}


module.exports = {
    createStore,
    getStores,
    getStoreById,
    editStore,
    deleteStore,
    createDeliveryFee,
    editDeliveryFee,
    deleteDeliveryFee,
    getOrdersByStoreId,
    disableStore,
    enableStore,
    storeLogin
};
