const express = require('express');
const jwt = require('jsonwebtoken');
const { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUserProfile, 
  verifyEmail, 
  refreshToken 
} = require('../controllers/userController');

const { authMiddleware } = require('../middleware/authMiddleware');
const passport = require('passport');

const router = express.Router();

// Authentication Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', authMiddleware, getUserProfile);
router.get('/verify-email/:token', verifyEmail);
router.get('/refresh-token', refreshToken);
router.get('/google-authenticate', passport.authenticate('google', { scope: ['profile', 'email'] })); // added google auth
router.get('/auth/google/login', passport.authenticate('google', { failureRedirect: '/login' }), async(req, res) => { // added google auth
     const token = await jwt.sign({ userId: req.user._id, isVerified: req.user.isVerified }, process.env.JWT_SECRET, { expiresIn: "1day" });
     res.status(200).json({
        message: "Login successful", 
        data: req.user,
        token
       });
});
module.exports = router;
