// middleware/auth.js – JWT verification + role guard
const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer token in the Authorization header.
 * Attaches decoded payload to req.user.
 */
const authenticate = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;           // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Role guard factory – use after authenticate().
 * e.g. requireRole('admin')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, requireRole };
