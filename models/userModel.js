// models/userModel.js – all DB queries for the users table
const db = require('../config/db');

const UserModel = {
  /** Find active user by email */
  findByEmail: async (email) => {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE',
      [email]
    );
    return rows[0] || null;
  },

  /** Find active user by PK */
  findById: async (id) => {
    const { rows } = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );
    return rows[0] || null;
  },

  /** List all reviewers (admin view) */
  listReviewers: async () => {
    const { rows } = await db.query(
      `SELECT id, name, email, created_at,
              (SELECT COUNT(*) FROM assignments a WHERE a.reviewer_id = u.id AND a.is_deleted = FALSE) AS assigned_papers,
              (SELECT COUNT(*) FROM reviews r WHERE r.reviewer_id = u.id AND r.status = 'submitted') AS submitted_reviews
       FROM users u
       WHERE role = 'reviewer' AND is_deleted = FALSE
       ORDER BY name`
    );
    return rows;
  },

  /** Create new reviewer (admin only) */
  create: async ({ name, email, password, role = 'reviewer' }) => {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, password, role]
    );
    return rows[0];
  },

  /** Soft-delete a user */
  softDelete: async (id) => {
    const { rows } = await db.query(
      'UPDATE users SET is_deleted = TRUE WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = UserModel;
