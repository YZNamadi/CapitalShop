const express = require('express');
const { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUserProfile, 
  verifyEmail, 
  refreshToken 
} = require('../controllers/userController');

const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Authentication Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', authMiddleware, getUserProfile);
router.get('/verify-email/:token', verifyEmail);
router.get('/refresh-token', refreshToken);

module.exports = router;
