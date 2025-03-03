const express = require('express');
const router = express.Router();

// Import authMiddleware
const {authMiddleware} = require('../middleware/authMiddleware');


// Import placeOrder
const { placeOrder } = require('../controllers/orderController');


// Define the route
router.post('/checkout', authMiddleware, placeOrder);

module.exports = router;