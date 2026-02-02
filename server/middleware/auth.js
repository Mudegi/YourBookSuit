const { jwtVerify } = require('jose');

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const { payload } = await jwtVerify(token, secret);

    // Attach user info to request
    req.user = {
      id: payload.userId,
      email: payload.email
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

/**
 * Optional authentication middleware
 * Allows requests without tokens but attaches user if token is present
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
      const { payload } = await jwtVerify(token, secret);
      req.user = {
        id: payload.userId,
        email: payload.email
      };
    }

    next();
  } catch (error) {
    // Don't fail on optional auth
    next();
  }
}

module.exports = {
  authenticateToken,
  optionalAuth
};
