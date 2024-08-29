const express = require('express');
const router = express.Router();
const userController = require('../controllers/userControllers');
const storeController = require("../controllers/storeControllers")
const { auth } = require('../middleware/auth'); // Middleware to authenticate user

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.get('/', userController.getUsers);
router.post('/logout', userController.logoutUser);
router.put('/update', auth, userController.updateUser);

// New route for verifying session
router.get('/verify-session', userController.verifySession);

// Store login
router.post('/store-login', storeController.storeLogin);

module.exports = router;
