// routes/analyticsRoutes.js
const express       = require('express');
const router        = express.Router();
const analyticsCtrl = require('../controllers/analyticsController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/overview',         authenticate, requireRole('admin'), analyticsCtrl.overview);
router.get('/papers',           authenticate, requireRole('admin'), analyticsCtrl.paperAnalytics);
router.get('/reviewers',        authenticate, requireRole('admin'), analyticsCtrl.reviewerAnalytics);
router.get('/recommendations',  authenticate, requireRole('admin'), analyticsCtrl.recommendationBreakdown);

module.exports = router;
