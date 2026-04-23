// routes/authRoutes.js
const express        = require('express');
const router         = express.Router();
const { body }       = require('express-validator');
const authCtrl       = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate       = require('../middleware/validate');

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  authCtrl.login
);

router.get('/me', authenticate, authCtrl.me);

// Admin creates reviewer accounts
router.post('/register',
  authenticate,
  requireRole('admin'),
  [
    body('name').notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be ≥6 chars'),
    body('role').optional().isIn(['admin', 'reviewer']).withMessage('Invalid role'),
  ],
  validate,
  authCtrl.register
);

module.exports = router;
