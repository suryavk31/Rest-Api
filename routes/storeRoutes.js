const express = require('express');
const router = express.Router();
const storeControllers = require('../controllers/storeControllers');

router.post('/create', storeControllers.createStore);
router.get('/', storeControllers.getStores);
router.get('/:id', storeControllers.getStoreById);
router.put('/:id', storeControllers.editStore);
router.delete('/:id', storeControllers.deleteStore);
router.post('/delivery-fee', storeControllers.createDeliveryFee);
router.put('/delivery-fee/:id', storeControllers.editDeliveryFee);
router.delete('/delivery-fee/:id', storeControllers.deleteDeliveryFee);
router.put('/:id/enable', storeControllers.enableStore);
router.put('/:id/disable', storeControllers.disableStore);


module.exports = router;
