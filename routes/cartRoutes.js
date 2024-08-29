const express = require('express');
const { addToCart, getCart, updateCartQuantity, removeFromCart, removeAllFromCart } = require('../controllers/cartControllers');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/add', auth, addToCart);
router.get('/', auth, getCart);
router.put('/update', auth, updateCartQuantity);
router.delete('/remove', auth, removeFromCart);
router.delete('/removeAll', auth, removeAllFromCart); // New route for removing all products from cart

module.exports = router;
