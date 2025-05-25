const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  verifyEmail,
  refreshToken,
} = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { registrationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User authentication and management
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
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/register', registrationLimiter, registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Unauthorized - Invalid credentials
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Log out a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authMiddleware, logoutUser);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized - Token missing or invalid
 */
router.get('/profile', authMiddleware, getUserProfile);

/**
 * @swagger
 * /api/users/verify-email/{token}:
 *   get:
 *     summary: Verify email using a token
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid token
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * @swagger
 * /api/users/refresh-token:
 *   get:
 *     summary: Refresh authentication token
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Unauthorized - Invalid or expired refresh token
 */
router.get('/refresh-token', authMiddleware, refreshToken);

/**
 * @swagger
 * /api/users/google-authenticate:
 *   get:
 *     summary: Authenticate using Google
 *     tags: [Users]
 *     responses:
 *       302:
 *         description: Redirects to Google for authentication
 */
router.get('/google-authenticate', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * @swagger
 * /api/users/auth/google/login:
 *   get:
 *     summary: Handle Google authentication callback
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized - Authentication failed
 */
router.get('/auth/google/login', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
  try {
    const token = jwt.sign(
      { userId: req.user._id, isVerified: req.user.isVerified },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      data: req.user,
      token,
    });
  } catch (error) {
    console.error('JWT Signing Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
