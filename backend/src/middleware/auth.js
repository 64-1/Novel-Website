const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

/**
 * Middleware to protect routes - requires valid JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Not authorized, no token provided'
        }
      });
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Get user from token (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'User not found'
          }
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Not authorized, token invalid or expired'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is the resource owner
 * Assumes req.user is already set by protect middleware
 * and req.params contains resourceUserId or authorId
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: `User role '${req.user.role}' is not authorized to access this route`
        }
      });
    }
    next();
  };
};

/**
 * Middleware to check if user owns the resource
 * Works with resources that have userId or authorId field
 */
const checkOwnership = (Model, idParam = 'id', ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params[idParam]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found'
          }
        });
      }

      // Check if user owns the resource
      if (resource[ownerField].toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to access this resource'
          }
        });
      }

      // Attach resource to request for use in controller
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Sets req.user if valid token is provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        req.user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        // Invalid token, but we don't fail - just continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  authorize,
  checkOwnership,
  optionalAuth
};
