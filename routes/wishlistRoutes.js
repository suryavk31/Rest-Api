const express = require('express');
const router = express.Router();
const { addToWishlist, getWishlist } = require('../controllers/wishlistControllers');
const { auth } = require('../middleware/auth');

router.post('/add', auth, addToWishlist);
router.get('/', auth, getWishlist);

module.exports = router;
