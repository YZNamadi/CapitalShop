const rateLimit = require('express-rate-limit');

// Basic rate limiter
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter (for login/signup endpoints)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed requests per hour
  message: 'Too many failed attempts, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 registration attempts per hour
  message: {
    status: 'error',
    message: 'Too many registration attempts. Please try again in an hour.',
    waitTime: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  basicLimiter,
  authLimiter,
  registrationLimiter
}; 