const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Check if it's a guest user
    if (decoded.isGuest) {
      req.user = {
        username: decoded.username,
        isGuest: true
      };
      return next();
    }

    // For registered users, check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - user not found'
      });
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      isGuest: false
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

// Optional auth - doesn't require token but adds user info if present
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    if (decoded.isGuest) {
      req.user = {
        username: decoded.username,
        isGuest: true
      };
    } else {
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = {
          userId: decoded.userId,
          username: decoded.username,
          isGuest: false
        };
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
};

// Admin check middleware
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking admin status',
      error: error.message
    });
  }
};

// Rate limiting middleware
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(identifier)) {
      const userRequests = requests.get(identifier);
      const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
      requests.set(identifier, recentRequests);
    }

    // Get current request count
    const currentRequests = requests.get(identifier) || [];
    
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    currentRequests.push(now);
    requests.set(identifier, currentRequests);

    next();
  };
};

module.exports = {
  auth,
  optionalAuth,
  isAdmin,
  rateLimit
};