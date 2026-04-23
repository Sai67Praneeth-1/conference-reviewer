// models/assignmentModel.js – DB queries for assignments table
const db = require('../config/db');

const AssignmentModel = {
  /** Assign a reviewer to a paper */
  create: async (paperId, reviewerId) => {
    const { rows } = await db.query(
      `INSERT INTO assignments (paper_id, reviewer_id)
       VALUES ($1, $2)
       ON CONFLICT (paper_id, reviewer_id) DO UPDATE SET is_deleted = FALSE
       RETURNING *`,
      [paperId, reviewerId]
    );
    return rows[0];
  },

  /** Remove an assignment (soft delete) */
  remove: async (paperId, reviewerId) => {
    const { rows } = await db.query(
      `UPDATE assignments SET is_deleted = TRUE
       WHERE paper_id = $1 AND reviewer_id = $2
       RETURNING id`,
      [paperId, reviewerId]
    );
    return rows[0] || null;
  },

  /** All assignments for a paper */
  findByPaper: async (paperId) => {
    const { rows } = await db.query(
      `SELECT a.*, u.name AS reviewer_name, u.email AS reviewer_email,
              COALESCE(r.status, 'not_started') AS review_status
       FROM assignments a
       JOIN users u ON u.id = a.reviewer_id
       LEFT JOIN reviews r ON r.paper_id = a.paper_id AND r.reviewer_id = a.reviewer_id
       WHERE a.paper_id = $1 AND a.is_deleted = FALSE`,
      [paperId]
    );
    return rows;
  },

  /** Check if reviewer is assigned to paper */
  exists: async (paperId, reviewerId) => {
    const { rows } = await db.query(
      `SELECT id FROM assignments
       WHERE paper_id = $1 AND reviewer_id = $2 AND is_deleted = FALSE`,
      [paperId, reviewerId]
    );
    return rows.length > 0;
  },
};

module.exports = AssignmentModel;
