const jwt = require('jsonwebtoken');
const User = require('../models/user');  

exports.authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader); // Debug log

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid header format:', authHeader); // Debug log
      return res.status(401).json({ error: 'No token provided or invalid format' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token); // Debug log

    if (!token) {
      console.log('No token after split'); // Debug log
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the token
    let decoded;
    try {
      console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Is set' : 'Not set'); // Debug log (safe way)
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded); // Debug log
    } catch (error) {
      console.error('Token verification error:', error.message);
      console.error('Token that failed:', token); // Debug log
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.userId) {
      console.log('Missing userId in decoded token'); // Debug log
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
