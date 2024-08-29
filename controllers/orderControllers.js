const Razorpay = require("razorpay");
const db = require('../services/db');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

async function verifyPayment(req, res) {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing payment details" });
        }

        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid signature" });
        }

        // Update order status to 'Paid'
        await db.query(
            "UPDATE orders SET payment_status = ? WHERE razorpay_order_id = ?",
            ["Paid", razorpay_order_id]
        );

        res.status(200).json({ message: "Payment verified successfully" });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Error verifying payment" });
    }
}

async function addOrder(req, res) {
    try {
        const { phone_number, location, cartItems, address, payment_method = "Razorpay", payment_status = "Pending", delivery_notes } = req.body;

        if (!phone_number || !location || !cartItems || cartItems.length === 0 || !address) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Get the store ID based on location
        const storeResult = await db.query(
            "SELECT store_id FROM locations WHERE id = ?",
            [location]
        );

        let store_id;
        if (storeResult.length > 0) {
            store_id = storeResult[0].store_id;
        } else {
            store_id = "ADM001"; // Default store ID if no location is found
        }

        let totalPrice = 0;

        // Fetch product details including image URLs and categories
        const productDetailsPromises = cartItems.map(item =>
            db.query(
                "SELECT Product_id, Prodouct_img_0, Categories FROM product WHERE Product_id = ?",
                [item.product_id]
            )
        );

        const productDetailsResults = await Promise.all(productDetailsPromises);

        const productDetailsMap = new Map();
        productDetailsResults.forEach((result, index) => {
            if (result.length > 0) {
                productDetailsMap.set(cartItems[index].product_id, {
                    image: result[0].Prodouct_img_0 || null,
                    category: result[0].Categories || null
                });
            }
        });

        cartItems.forEach(item => {
            totalPrice += item.sell_price * item.quantity;
        });

        const options = {
            amount: totalPrice * 100, // Razorpay expects amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Insert order into the orders table
        const result = await db.query(
            "INSERT INTO orders (user_id, total_price, store_id, location_id, razorpay_order_id, address, phone_number, delivery_notes, status, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                phone_number,
                totalPrice,
                store_id,
                location,
                razorpayOrder.id,
                address,
                phone_number,
                delivery_notes || null,
                "New",
                payment_method,
                payment_status
            ]
        );

        const order_id = result.insertId;

        // Insert each item into the order_items table including the category
        for (const item of cartItems) {
            const productDetails = productDetailsMap.get(item.product_id) || {};
            const productImage = productDetails.image || null;
            const category = productDetails.category || null;

            await db.query(
                "INSERT INTO order_items (order_id, product_id, quantity, sell_price, weight, product_image_0, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    order_id,
                    item.product_id,
                    item.quantity,
                    item.sell_price,
                    item.weight || null, // Handle undefined weight
                    productImage,
                    category
                ]
            );
        }
        res.status(200).json({ message: "Order placed successfully", razorpayOrder, totalPrice });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Error placing order" });
    }
}

async function getOrders(req, res) {
    try {
        const { phone_number, store_id } = req.query;

        const orders = await db.query(
            `SELECT orders.*, 
                    product.Product_name, product.Brand_name, product.kind, product.offer, product.you_save, product.Prodouct_img_0, product.MRP, product.sell_price, 
                    product.Categories, product.Sub_Categories, product.Sub_Sub_Categories, product.Weight,
                    delivery_fees.primary_location_fee, 
                    delivery_fees.sec_location_1_fee, 
                    delivery_fees.sec_location_2_fee, 
                    delivery_fees.sec_location_3_fee, 
                    delivery_fees.sec_location_4_fee, 
                    delivery_fees.sec_location_5_fee 
             FROM orders 
             JOIN product ON orders.product_id = product.Product_id 
             LEFT JOIN delivery_fees ON orders.location_id = delivery_fees.location_id 
             WHERE orders.user_id = ? AND orders.store_id = ?`,
            [phone_number, store_id]
        );

        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Failed to get Orders" });
    }
}

const getOrderById = async (req, res) => {
    try {
        const { id } = req.params; // Get the order ID from the route parameters

        if (!id) {
            return res.status(400).json({ error: "Order ID is required" });
        }

        // Fetch the order details along with items and product information
        const orders = await db.query(
            `SELECT orders.*, 
                    product.Product_name, 
                    order_items.quantity AS item_quantity, 
                    order_items.sell_price AS item_sell_price, 
                    order_items.product_id AS item_product_id, 
                    order_items.weight AS item_weight, 
                    order_items.product_image_0 AS item_product_image_0, 
                    order_items.category AS item_category,
                    order_items.status AS item_status,
                    delivery_fees.primary_location_fee, 
                    delivery_fees.sec_location_1_fee, 
                    delivery_fees.sec_location_2_fee, 
                    delivery_fees.sec_location_3_fee, 
                    delivery_fees.sec_location_4_fee, 
                    delivery_fees.sec_location_5_fee
             FROM orders 
             JOIN order_items ON orders.order_id = order_items.order_id
             JOIN product ON order_items.product_id = product.Product_id
             LEFT JOIN delivery_fees ON orders.location_id = delivery_fees.location_id 
             WHERE orders.order_id = ?`, // Use a parameterized query to prevent SQL injection
            [id] // Pass the order ID as a parameter
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Transform the result to group order items under each order
        const orderDetails = orders.reduce((acc, order) => {
            const {
                order_id, 
                Product_name, 
                item_quantity, 
                item_sell_price, 
                item_product_id, 
                item_weight, 
                item_product_image_0, 
                item_category, 
                item_status,
                primary_location_fee,
                sec_location_1_fee,
                sec_location_2_fee,
                sec_location_3_fee,
                sec_location_4_fee,
                sec_location_5_fee
            } = order;
            if (!acc[order_id]) {
                acc[order_id] = { ...order, order_items: [] };
            }
            acc[order_id].order_items.push({
                Product_name,
                quantity: item_quantity,
                sell_price: item_sell_price,
                product_id: item_product_id,
                weight: item_weight,
                product_image_0: item_product_image_0,
                category: item_category,
                status: item_status
            });

            // Optionally include delivery fees if necessary
            acc[order_id].delivery_fees = {
                primary_location_fee,
                sec_location_1_fee,
                sec_location_2_fee,
                sec_location_3_fee,
                sec_location_4_fee,
                sec_location_5_fee
            };

            return acc;
        }, {});

        const result = Object.values(orderDetails);
        res.json(result);
    } catch (error) {
        console.error("Error fetching order by ID:", error);
        res.status(500).json({ error: "Failed to get order details" });
    }
};

async function getOrderByPhone(req, res) {
    try {
        const { phone_number } = req.query;

        if (!phone_number) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        // Normalize phone number format
        const normalizedPhoneNumber = phone_number.startsWith('+') ? phone_number : `+${phone_number.trim()}`;

        console.log(`Fetching orders for phone number: ${normalizedPhoneNumber}`);

        const query = `
            SELECT orders.*, 
                   product.Product_name, 
                   order_items.quantity AS item_quantity, 
                   order_items.sell_price AS item_sell_price, 
                   order_items.product_id AS item_product_id, 
                   order_items.weight AS item_weight, 
                   order_items.product_image_0 AS item_product_image_0, 
                   order_items.category AS item_category,
                   order_items.status AS item_status
            FROM orders 
            JOIN order_items ON orders.order_id = order_items.order_id
            JOIN product ON order_items.product_id = product.Product_id 
            WHERE orders.phone_number = ?;
        `;

        console.log('Executing query:', query);

        const orders = await db.query(query, [normalizedPhoneNumber]);

        console.log("Orders fetched from database:", orders);

        if (orders.length === 0) {
            return res.status(404).json({ error: "No orders found for this phone number" });
        }

        const ordersWithItems = orders.reduce((acc, order) => {
            const { order_id, Product_name, item_quantity, item_sell_price, item_product_id, item_weight, item_product_image_0, item_category, item_status } = order;
            if (!acc[order_id]) {
                acc[order_id] = { ...order, order_items: [] };
            }
            acc[order_id].order_items.push({
                Product_name,
                quantity: item_quantity,
                sell_price: item_sell_price,
                product_id: item_product_id,
                weight: item_weight,
                product_image_0: item_product_image_0,
                category: item_category,
                status: item_status
            });
            return acc;
        }, {});

        const result = Object.values(ordersWithItems);
        res.json(result);
    } catch (error) {
        console.error("Error fetching orders by phone number:", error);
        res.status(500).json({ error: "Failed to get orders" });
    }
}
async function getOrdersByStoreId(req, res) {
    try {
        const { store_id } = req.query;

        if (!store_id) {
            return res.status(400).json({ error: "Store ID is required" });
        }

        // Update SQL query to include categories and order item details
        const orders = await db.query(
            `SELECT orders.*, 
                    product.Product_name, product.Product_id, product.Brand_name, product.kind, product.offer, product.you_save, product.Prodouct_img_0, product.MRP, product.sell_price, 
                    product.Categories, product.Sub_Categories, product.Sub_Sub_Categories, product.Weight, 
                    delivery_fees.primary_location_fee, 
                    delivery_fees.sec_location_1_fee, 
                    delivery_fees.sec_location_2_fee, 
                    delivery_fees.sec_location_3_fee, 
                    delivery_fees.sec_location_4_fee, 
                    delivery_fees.sec_location_5_fee,
                    order_items.quantity AS item_quantity, order_items.sell_price AS item_sell_price, order_items.product_id AS item_product_id, order_items.weight AS item_weight,
                    order_items.product_image_0 AS item_product_image_0, 
                    order_items.category AS item_category,
                    order_items.status AS item_status
             FROM orders 
             JOIN order_items ON orders.order_id = order_items.order_id
             JOIN product ON order_items.product_id = product.Product_id
             LEFT JOIN delivery_fees ON orders.location_id = delivery_fees.location_id 
             WHERE orders.store_id = ?`,
            [store_id]
        );

        // Transform the result to group order items under each order
        const ordersWithItems = orders.reduce((acc, order) => {
            const { order_id, Product_name, item_quantity, item_sell_price, item_product_id, item_weight, item_product_image_0, item_category, item_status } = order;
            if (!acc[order_id]) {
                acc[order_id] = { ...order, order_items: [] };
            }
            acc[order_id].order_items.push({
                Product_name: Product_name,
                quantity: item_quantity,
                sell_price: item_sell_price,
                product_id: item_product_id,
                weight: item_weight,
                product_image_0: item_product_image_0,
                category: item_category, // Include category here
                status: item_status // Include status here
            });
            return acc;
        }, {});

        const result = Object.values(ordersWithItems);
        res.json(result);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function cancelOrder(req, res) {
    try {
        const { phone_number, order_id } = req.body;

        const order = await db.query(
            'SELECT * FROM orders WHERE user_id = ? AND order_id = ?',
            [phone_number, order_id]
        );

        if (order.length === 0) {
            return res.status(400).json({ error: 'Order not found' });
        }

        await db.query(
            'DELETE FROM orders WHERE user_id = ? AND order_id = ?',
            [phone_number, order_id]
        );

        res.json({ message: 'Order canceled successfully' });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
}

async function addStoreOrder(req, res) {
    try {
        const { store_id, product_id, quantity, price } = req.body;

        if (!store_id || !product_id || !quantity || !price) {
            return res.status(400).json({ error: "Missing required fields" })
        }
        await db.query(
            'INSERT INTO store_orders (store_id, product_id, quantity, price) VALUE (?, ?, ?, ?)',
            [store_id, product_id, quantity, price]
        );
        res.json({ message: "Store Order Placed successfully" });
    } catch (error) {
        console.log("Error placing store order:", error);
        res.status(500).json({ error: "Failed to place store order" })
    }
}

async function updateOrderStatus(req, res) {
    try {
        const { order_id, status } = req.body;
        if (!order_id || !status) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const allowedStatuses = ["New", "Accepted", "Dispatched", "Delivered", "Canceled"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid Status" });
        }

        const result = await db.query(
            "UPDATE orders SET status = ? WHERE order_id = ?",
            [status, order_id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.status(200).json({ message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Failed to update order status" });
    }
}

async function forwardOrder(req, res) {
    try {
        const { order_id, sub_store_id, items_to_forward } = req.body;

        if (!order_id || !sub_store_id || !items_to_forward || items_to_forward.length === 0) {
            return res.status(400).json({ error: "Missing required fields or items to forward" });
        }

        // Fetch the order to forward
        const [order] = await db.query('SELECT * FROM orders WHERE order_id = ?', [order_id]);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Create a new forwarded order entry
        const result = await db.query(
            'INSERT INTO forwarded_orders (original_order_id, store_id, sub_store_id) VALUES (?, ?, ?)',
            [order_id, order.store_id, sub_store_id]
        );

        const forwarded_order_id = result.insertId;

        // Insert specified items into the forwarded_order_items table
        const insertItemsPromises = items_to_forward.map(item =>
            db.query(
                'INSERT INTO forwarded_order_items (forwarded_order_id, product_id, quantity, sell_price, weight, product_image_0) VALUES (?, ?, ?, ?, ?, ?)',
                [forwarded_order_id, item.product_id, item.quantity, parseFloat(item.sell_price), parseFloat(item.weight), item.product_image_0]
            )
        );

        await Promise.all(insertItemsPromises);

        // Update the status of the original order to "Forwarded"
        await db.query('UPDATE orders SET status = ? WHERE order_id = ?', ['Forwarded', order_id]);

        res.status(200).json({ message: "Order forwarded successfully" });
    } catch (error) {
        console.error("Error forwarding order:", error);
        res.status(500).json({ message: "Failed to forward order", error: error.message });
    }
}

async function getForwardedOrders(req, res) {
    try {
        const { store_id } = req.query;
        console.log('Store ID:', store_id);

        if (!store_id) {
            return res.status(400).json({ error: "Store ID is required" });
        }

        // Fetch forwarded orders by store_id
        const orders = await db.query(
            `SELECT forwarded_orders.*, 
                    orders.status AS original_order_status, 
                    orders.address AS original_order_address, 
                    orders.phone_number AS original_order_phone_number,
                    product.Product_name, product.Brand_name, product.kind, product.offer, product.you_save, product.Prodouct_img_0, product.MRP, product.sell_price, 
                    product.Categories, product.Sub_Categories, product.Sub_Sub_Categories, product.Weight, 
                    forwarded_order_items.quantity AS item_quantity, 
                    forwarded_order_items.sell_price AS item_sell_price, 
                    forwarded_order_items.product_id AS item_product_id, 
                    forwarded_order_items.weight AS item_weight, 
                    forwarded_order_items.product_image_0 AS item_product_image_0
             FROM forwarded_orders 
             JOIN forwarded_order_items ON forwarded_orders.id = forwarded_order_items.forwarded_order_id
             JOIN product ON forwarded_order_items.product_id = product.Product_id
             JOIN orders ON forwarded_orders.original_order_id = orders.order_id
             WHERE forwarded_orders.store_id = ?`,
            [store_id]
        );

        // Transform the result to group order items under each forwarded order
        const forwardedOrdersWithItems = orders.reduce((acc, order) => {
            const { id, original_order_id, Product_name, item_quantity, item_sell_price, item_product_id, item_weight, item_product_image_0 } = order;
            if (!acc[id]) {
                acc[id] = { ...order, order_items: [] };
            }
            acc[id].order_items.push({
                Product_name: Product_name,
                quantity: item_quantity,
                sell_price: item_sell_price,
                product_id: item_product_id,
                weight: item_weight, // Include weight here
                product_image_0: item_product_image_0 // Include product image here
            });
            return acc;
        }, {});

        const result = Object.values(forwardedOrdersWithItems);
        res.json(result);
    } catch (error) {
        console.error("Error fetching forwarded orders:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function updateOrderItemStatus(req, res) {
    try {
        const { order_id, items } = req.body;
        if (!order_id || !items) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const allowedStatuses = ["New", "Accepted", "Dispatched", "Delivered", "Canceled", "Forwarded"]
        for (const item of items) {
            if (!item.product_id || !item.status || !allowedStatuses.includes(item.status)) {
                return res.status(400).json({ message: "Invalid product or status" })
            }            
        }
        // Prepare SQL queries
        const updatePromises = items.map(item => {
            const query = "UPDATE order_items SET status = ? WHERE product_id = ? AND order_id = ?";
            const values = [item.status, item.product_id, order_id];
            console.log("Executing query:", query, "with values:", values);
            return db.query(query, values);
        });

        const results = await Promise.all(updatePromises);
        // Check affected rows
        const affectedRows = results.reduce((acc, result) => acc + result.affectedRows, 0);

        if (affectedRows === 0) {
            return res.status(404).json({ message: "No items updated, please check the product IDs and status" });
        }
        res.json({ message: "Order items status updated successfully" });
    } catch (error) {
        console.error("Error updating order item status:", error);
        res.status(500).json({ error: "Failed to update order item status" })        
    }
}


module.exports = {
  addOrder,
  getOrders,
  cancelOrder,
  getOrdersByStoreId,
  addStoreOrder,
  updateOrderStatus,
  forwardOrder,
  getForwardedOrders,
  updateOrderItemStatus,
  verifyPayment,
  getOrderByPhone,
  getOrderById
};
