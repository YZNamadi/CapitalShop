
// const express = require('express');
// const router = express.Router();
// const authMiddleware = require('../middleware/authMiddleware');
// const cartController = require('../controllers/cartController');

// // Add item to cart
// router.post('/add', authMiddleware, cartController.addItemToCart);

// // Get user's cart
// router.get('/', authMiddleware, cartController.getCart);

// module.exports = router;

const express = require('express');
const { 
  addItemToCart, 
  getCart, 
  removeItemFromCart, 
  updateCartItem, 
  clearCart, 
  getCartTotal, 
  applyDiscount 
} = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add', authMiddleware, addItemToCart);
router.get('/', authMiddleware, getCart);
router.delete('/remove', authMiddleware, removeItemFromCart);
router.put('/update', authMiddleware, updateCartItem);
router.delete('/clear', authMiddleware, clearCart);
router.get('/total', authMiddleware, getCartTotal);
router.post('/apply-discount', authMiddleware, applyDiscount); 

module.exports = router;
