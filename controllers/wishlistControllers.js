const db = require('../services/db');

async function addToWishlist(req, res) {
    try {
        const { product_id } = req.body;
        const user_id = req.user.id;

        await db.query(
            'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = NOW()',
            [user_id, product_id]
        );
        res.json({ message: 'Product added to wishlist' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
}

async function getWishlist(req, res) {
    try {
        const user_id = req.user.id;
        const wishlist = await db.query(
            `SELECT wishlist.*, products.Product_name, products.Brand_name, products.kind, products.offer, products.you_save, products.Prodouct_img_0, products.MRP, products.sell_price, products.size, products.Categories, products.Sub_Categories, products.Sub_Sub_Categories, products.Weight 
             FROM wishlist 
             JOIN products ON wishlist.product_id = products.Product_id 
             WHERE wishlist.user_id = ?`,
            [user_id]
        );
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
}

module.exports = { addToWishlist, getWishlist };
