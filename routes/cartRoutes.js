const express = require('express');
const {
  addItemToCart,
  getCart,
  removeItemFromCart,
  updateCartItem,
  clearCart,
  getCartTotal,
  applyDiscount,
} = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add an item to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: "Bearer <your_token>"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to add to cart
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity of the product to add
 *     responses:
 *       201:
 *         description: Item added to cart successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/add', authMiddleware, addItemToCart);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: "Bearer <your_token>"
 *     responses:
 *       200:
 *         description: User's cart retrieved successfully
 *       401:
 *         description: Unauthorized - Token missing or invalid
 */
router.get('/', authMiddleware, getCart);

/**
 * @swagger
 * /api/cart/remove:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to remove from cart
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       400:
 *         description: Invalid request data
 */
router.delete('/remove', authMiddleware, removeItemFromCart);

/**
 * @swagger
 * /api/cart/update:
 *   put:
 *     summary: Update an item in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to update in cart
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: New quantity of the product
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Invalid request data
 */
router.put('/update', authMiddleware, updateCartItem);

/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     summary: Clear the entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Unauthorized - Token missing or invalid
 */
router.delete('/clear', authMiddleware, clearCart);

/**
 * @swagger
 * /api/cart/total:
 *   get:
 *     summary: Get the total price of items in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total cart value retrieved successfully
 *       401:
 *         description: Unauthorized - Token missing or invalid
 */
router.get('/total', authMiddleware, getCartTotal);

/**
 * @swagger
 * /api/cart/apply-discount:
 *   post:
 *     summary: Apply a discount code to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discountCode
 *             properties:
 *               discountCode:
 *                 type: string
 *                 description: Discount code to apply to the cart
 *     responses:
 *       200:
 *         description: Discount applied successfully
 *       400:
 *         description: Invalid discount code
 */
router.post('/apply-discount', authMiddleware, applyDiscount);

module.exports = router;
