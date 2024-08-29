const db = require('../services/db');

// Function to fetch product details by product ID
async function fetchProductDetails(product_id) {
    const product = await db.query(
        'SELECT * FROM products WHERE Product_id = ?',
        [product_id]
    );
    if (product.length === 0) {
        throw new Error('Product not found');
    }
    return product[0];
}

// Function to add a product to the cart
async function addToCart(req, res) {
    try {
        const { product_id, quantity } = req.body;
        const user_id = req.user.id;

        // Fetch product details
        const product = await fetchProductDetails(product_id);

        // Check if the product is already in the cart
        const existingItem = await db.query(
            'SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );

        if (existingItem.length > 0) {
            // If the product is already in the cart, update the quantity
            await db.query(
                'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity, user_id, product_id]
            );
        } else {
            // If the product is not in the cart, insert a new row
            await db.query(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [user_id, product_id, quantity]
            );
        }

        res.json({ message: 'Product added to cart', product });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add product to cart' });
    }
}

// Function to get the cart items
async function getCart(req, res) {
    try {
        const user_id = req.user.id;
        const cartItems = await db.query(
            `SELECT cart.*, products.Product_name, products.Brand_name, products.kind, products.offer, products.you_save, products.Prodouct_img_0, products.MRP, products.sell_price, products.size, products.Categories, products.Sub_Categories, products.Sub_Sub_Categories, products.Weight 
             FROM cart 
             JOIN products ON cart.product_id = products.Product_id 
             WHERE cart.user_id = ?`,
            [user_id]
        );

        let totalPrice = 0;
        cartItems.forEach(item => {
            // Parse numeric fields to ensure they are numbers
            const price = parseFloat(item.sell_price);
            const quantity = parseInt(item.quantity);
            totalPrice += price * quantity;
        });

        res.json({ cartItems, totalPrice });
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).json({ error: 'Failed to get cart' });
    }
}

// Function to update cart quantity
async function updateCartQuantity(req, res) {
    try {
        const { product_id, quantity } = req.body;
        const user_id = req.user.id;

        // Update the quantity of the product in the cart
        await db.query(
            'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
            [quantity, user_id, product_id]
        );

        res.json({ message: 'Cart quantity updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update cart quantity' });
    }
}

// Function to remove a product from the cart
async function removeFromCart(req, res) {
    try {
        const { product_id } = req.body;
        const user_id = req.user.id;

        await db.query(
            'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );
        res.json({ message: 'Product removed from cart' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove product from cart' });
    }
}

// Function to remove all products from the cart
async function removeAllFromCart(req, res) {
    try {
        const user_id = req.user.id;

        await db.query(
            'DELETE FROM cart WHERE user_id = ?',
            [user_id]
        );
        res.json({ message: 'All products removed from cart' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove all products from cart' });
    }
}

module.exports = { addToCart, getCart, updateCartQuantity, removeFromCart, removeAllFromCart };
