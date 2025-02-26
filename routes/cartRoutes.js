
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const cartController = require('../controllers/cartController');

// Add item to cart
router.post('/add', authMiddleware, cartController.addItemToCart);

// Get user's cart
router.get('/', authMiddleware, cartController.getCart);

module.exports = router;