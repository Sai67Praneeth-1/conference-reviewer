// models/reviewModel.js – DB queries for reviews table
const db = require('../config/db');

const ReviewModel = {
  /** Get a reviewer's review for a specific paper */
  findByPaperAndReviewer: async (paperId, reviewerId) => {
    const { rows } = await db.query(
      `SELECT r.*, p.title AS paper_title
       FROM reviews r JOIN papers p ON p.id = r.paper_id
       WHERE r.paper_id = $1 AND r.reviewer_id = $2 AND r.is_deleted = FALSE`,
      [paperId, reviewerId]
    );
    return rows[0] || null;
  },

  /** Create or update a review (upsert) */
  upsert: async ({ paperId, reviewerId, score, comments, recommendation, status }) => {
    const submitted_at = status === 'submitted' ? 'NOW()' : 'NULL';
    const { rows } = await db.query(
      `INSERT INTO reviews (paper_id, reviewer_id, score, comments, recommendation, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, ${submitted_at})
       ON CONFLICT (paper_id, reviewer_id) DO UPDATE
         SET score          = EXCLUDED.score,
             comments       = EXCLUDED.comments,
             recommendation = EXCLUDED.recommendation,
             status         = EXCLUDED.status,
             submitted_at   = CASE WHEN EXCLUDED.status = 'submitted' THEN NOW() ELSE reviews.submitted_at END
       RETURNING *`,
      [paperId, reviewerId, score, comments, recommendation, status]
    );
    return rows[0];
  },

  /** All reviews for a paper (admin) */
  findByPaper: async (paperId) => {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS reviewer_name, u.email AS reviewer_email
       FROM reviews r JOIN users u ON u.id = r.reviewer_id
       WHERE r.paper_id = $1 AND r.is_deleted = FALSE
       ORDER BY r.created_at`,
      [paperId]
    );
    return rows;
  },

  /** Analytics – average score per paper */
  avgScorePerPaper: async () => {
    const { rows } = await db.query(
      `SELECT p.id, p.title,
              ROUND(AVG(r.score)::NUMERIC, 2) AS avg_score,
              COUNT(r.id)                      AS review_count,
              COUNT(CASE WHEN r.status = 'submitted' THEN 1 END) AS submitted_count
       FROM papers p
       LEFT JOIN reviews r ON r.paper_id = p.id AND r.is_deleted = FALSE
       WHERE p.is_deleted = FALSE
       GROUP BY p.id, p.title
       ORDER BY avg_score DESC NULLS LAST`
    );
    return rows;
  },

  /** Analytics – reviews per reviewer */
  reviewsPerReviewer: async () => {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email,
              COUNT(r.id)                                              AS total_assigned,
              COUNT(CASE WHEN r.status = 'submitted' THEN 1 END)      AS submitted,
              COUNT(CASE WHEN r.status = 'draft'     THEN 1 END)      AS drafts,
              ROUND(AVG(CASE WHEN r.status='submitted' THEN r.score END)::NUMERIC, 2) AS avg_score_given
       FROM users u
       LEFT JOIN assignments a ON a.reviewer_id = u.id AND a.is_deleted = FALSE
       LEFT JOIN reviews r     ON r.reviewer_id = u.id AND r.paper_id = a.paper_id
       WHERE u.role = 'reviewer' AND u.is_deleted = FALSE
       GROUP BY u.id, u.name, u.email
       ORDER BY u.name`
    );
    return rows;
  },

  softDelete: async (id) => {
    const { rows } = await db.query(
      'UPDATE reviews SET is_deleted = TRUE WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = ReviewModel;
