// routes/paperRoutes.js
const express   = require('express');
const router    = express.Router();
const { body }  = require('express-validator');
const multer    = require('multer');
const path      = require('path');
const paperCtrl  = require('../controllers/paperController');
const reviewCtrl = require('../controllers/reviewController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate  = require('../middleware/validate');

// ── Multer setup for PDF uploads ──────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')),
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

// ── Paper CRUD ────────────────────────────────────────────
router.get('/',  authenticate, paperCtrl.list);
router.get('/:id', authenticate, paperCtrl.getOne);

router.post('/',
  authenticate, requireRole('admin'),
  upload.single('pdf'),
  [
    body('title').notEmpty().withMessage('Title required'),
    body('abstract').notEmpty().withMessage('Abstract required'),
    body('authors').notEmpty().withMessage('Authors required'),
    body('deadline').optional().isISO8601().withMessage('Invalid deadline date'),
  ],
  validate,
  paperCtrl.create
);

router.put('/:id',
  authenticate, requireRole('admin'),
  upload.single('pdf'),
  paperCtrl.update
);

router.delete('/:id', authenticate, requireRole('admin'), paperCtrl.remove);

// ── Assignments ───────────────────────────────────────────
router.post('/:id/assign',
  authenticate, requireRole('admin'),
  [body('reviewer_id').isInt().withMessage('reviewer_id must be integer')],
  validate,
  paperCtrl.assign
);

router.delete('/:id/assign/:reviewerId',
  authenticate, requireRole('admin'),
  paperCtrl.unassign
);

// ── Reviews ───────────────────────────────────────────────
router.get('/:paperId/review',   authenticate, reviewCtrl.getReview);
router.put('/:paperId/review',
  authenticate,
  [
    body('score').optional().isFloat({ min: 1, max: 10 }).withMessage('Score must be 1–10'),
    body('recommendation').optional().isIn(['accept','reject','weak_accept','weak_reject'])
      .withMessage('Invalid recommendation'),
    body('status').isIn(['draft','submitted']).withMessage('Status must be draft or submitted'),
  ],
  validate,
  reviewCtrl.saveReview
);

// Admin: see all reviews for a paper
router.get('/:paperId/reviews', authenticate, requireRole('admin'), reviewCtrl.listForPaper);

module.exports = router;
