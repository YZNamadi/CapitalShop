const jwt = require('jsonwebtoken');
const User = require('../models/user');  

exports.authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided or invalid format' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Token missing userId' });
    }

    // Convert string ID to ObjectId if necessary
    const userId = decoded.userId.toString();

    // Fetch user from the database
    const foundUser = await User.findById(userId).select('-password');
    if (!foundUser) {
      console.error('User not found for ID:', userId);
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to the request object
    req.user = foundUser;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
