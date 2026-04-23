// controllers/analyticsController.js  (admin only)
const ReviewModel = require('../models/reviewModel');
const UserModel   = require('../models/userModel');
const db          = require('../config/db');

/** GET /api/analytics/overview */
exports.overview = async (req, res) => {
  try {
    const [papersResult, reviewersResult, reviewsResult, deadlineResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM papers WHERE is_deleted = FALSE`),
      db.query(`SELECT COUNT(*) FROM users WHERE role='reviewer' AND is_deleted=FALSE`),
      db.query(`SELECT COUNT(*) FROM reviews WHERE status='submitted' AND is_deleted=FALSE`),
      db.query(`SELECT COUNT(*) FROM papers WHERE deadline < NOW() AND is_deleted=FALSE`),
    ]);

    res.json({
      totalPapers:         parseInt(papersResult.rows[0].count, 10),
      totalReviewers:      parseInt(reviewersResult.rows[0].count, 10),
      submittedReviews:    parseInt(reviewsResult.rows[0].count, 10),
      overdueDeadlines:    parseInt(deadlineResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ message: 'Failed to fetch overview' });
  }
};

/** GET /api/analytics/papers */
exports.paperAnalytics = async (req, res) => {
  try {
    const data = await ReviewModel.avgScorePerPaper();
    res.json({ data });
  } catch (err) {
    console.error('Paper analytics error:', err);
    res.status(500).json({ message: 'Failed to fetch paper analytics' });
  }
};

/** GET /api/analytics/reviewers */
exports.reviewerAnalytics = async (req, res) => {
  try {
    const data = await ReviewModel.reviewsPerReviewer();
    res.json({ data });
  } catch (err) {
    console.error('Reviewer analytics error:', err);
    res.status(500).json({ message: 'Failed to fetch reviewer analytics' });
  }
};

/** GET /api/analytics/recommendations */
exports.recommendationBreakdown = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT recommendation, COUNT(*) AS count
       FROM reviews
       WHERE status = 'submitted' AND is_deleted = FALSE AND recommendation IS NOT NULL
       GROUP BY recommendation`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('Recommendation breakdown error:', err);
    res.status(500).json({ message: 'Failed to fetch recommendation data' });
  }
};
