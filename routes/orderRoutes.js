
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const orderController = require('../controllers/orderController');

// Place an order
router.post('/checkout', authMiddleware, orderController.placeOrder);

module.exports = router;