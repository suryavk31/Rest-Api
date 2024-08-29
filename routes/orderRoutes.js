const express = require('express');
const router = express.Router();
const {
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
  getOrderById // Ensure this function is defined in your controllers
} = require('../controllers/orderControllers');

// Define routes
router.post('/add', addOrder);
router.post('/add-store-order', addStoreOrder);
router.post('/update-status', updateOrderStatus);
router.post('/update-item-status', updateOrderItemStatus); // POST for updating item status
router.get('/', getOrders); // GET for fetching orders
router.post('/cancel', cancelOrder); // Consider using DELETE for canceling orders
router.get('/orders-by-store', getOrdersByStoreId); // GET for fetching orders by store ID
router.post('/forward', forwardOrder);
router.get('/forwarded-orders', getForwardedOrders); // GET for fetching forwarded orders
router.get('/verify-payment', verifyPayment); // GET for verifying payment
router.get('/order-by-phone', getOrderByPhone); // GET for fetching order by phone
router.get('/order/:id', getOrderById); // New route for fetching order by ID

module.exports = router;
