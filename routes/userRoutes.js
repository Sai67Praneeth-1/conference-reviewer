// routes/userRoutes.js
const express    = require('express');
const router     = express.Router();
const userCtrl   = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/',    authenticate, requireRole('admin'), userCtrl.list);
router.get('/:id', authenticate, requireRole('admin'), userCtrl.getOne);
router.delete('/:id', authenticate, requireRole('admin'), userCtrl.remove);

module.exports = router;
