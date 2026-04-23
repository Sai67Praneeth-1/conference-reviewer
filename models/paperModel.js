// models/paperModel.js – DB queries for papers table
const db = require('../config/db');

const PaperModel = {
  /**
   * Papers assigned to a specific reviewer with review status.
   * Supports: search (title), filter (status), pagination.
   */
  findByReviewer: async ({ reviewerId, search, status, page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;
    const params = [reviewerId];
    let conditions = `a.reviewer_id = $1 AND a.is_deleted = FALSE AND p.is_deleted = FALSE`;

    if (search) {
      params.push(`%${search}%`);
      conditions += ` AND p.title ILIKE $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions += ` AND COALESCE(r.status, 'not_started') = $${params.length}`;
    }

    params.push(limit, offset);
    const limitParam  = params.length - 1;
    const offsetParam = params.length;

    const query = `
      SELECT
        p.id, p.title, p.abstract, p.authors, p.pdf_filename, p.deadline, p.created_at,
        COALESCE(r.status, 'not_started')  AS review_status,
        r.id                               AS review_id,
        r.score, r.recommendation
      FROM assignments a
      JOIN papers  p ON p.id = a.paper_id
      LEFT JOIN reviews r ON r.paper_id = a.paper_id AND r.reviewer_id = a.reviewer_id
      WHERE ${conditions}
      ORDER BY p.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`;

    const countQuery = `
      SELECT COUNT(*) FROM assignments a
      JOIN papers p ON p.id = a.paper_id
      LEFT JOIN reviews r ON r.paper_id = a.paper_id AND r.reviewer_id = a.reviewer_id
      WHERE ${conditions.replace(`LIMIT $${limitParam} OFFSET $${offsetParam}`, '')}`;

    // Re-build params without limit/offset for count
    const countParams = params.slice(0, params.length - 2);

    const [dataResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    return {
      papers: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  /** All papers (admin view) with pagination + search */
  findAll: async ({ search, page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;
    const params = [];
    let where = `p.is_deleted = FALSE`;

    if (search) {
      params.push(`%${search}%`);
      where += ` AND p.title ILIKE $${params.length}`;
    }

    params.push(limit, offset);

    const query = `
      SELECT
        p.*,
        u.name AS submitted_by_name,
        COUNT(DISTINCT a.reviewer_id)           AS assigned_count,
        ROUND(AVG(r.score)::NUMERIC, 2)         AS avg_score,
        COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.id END) AS submitted_reviews
      FROM papers p
      LEFT JOIN users       u ON u.id = p.submitted_by
      LEFT JOIN assignments a ON a.paper_id = p.id AND a.is_deleted = FALSE
      LEFT JOIN reviews     r ON r.paper_id = p.id
      WHERE ${where}
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const countParams = params.slice(0, -2);
    const countQuery = `SELECT COUNT(*) FROM papers p WHERE ${where}`;

    const [dataResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    return {
      papers: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  findById: async (id) => {
    const { rows } = await db.query(
      `SELECT p.*, u.name AS submitted_by_name
       FROM papers p LEFT JOIN users u ON u.id = p.submitted_by
       WHERE p.id = $1 AND p.is_deleted = FALSE`,
      [id]
    );
    return rows[0] || null;
  },

  create: async ({ title, abstract, authors, deadline, pdf_filename, submitted_by }) => {
    const { rows } = await db.query(
      `INSERT INTO papers (title, abstract, authors, deadline, pdf_filename, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, abstract, authors, deadline || null, pdf_filename || null, submitted_by]
    );
    return rows[0];
  },

  update: async (id, fields) => {
    const sets = [];
    const vals = [];
    Object.entries(fields).forEach(([k, v]) => {
      vals.push(v);
      sets.push(`${k} = $${vals.length}`);
    });
    vals.push(id);
    const { rows } = await db.query(
      `UPDATE papers SET ${sets.join(', ')} WHERE id = $${vals.length} AND is_deleted = FALSE RETURNING *`,
      vals
    );
    return rows[0] || null;
  },

  softDelete: async (id) => {
    const { rows } = await db.query(
      'UPDATE papers SET is_deleted = TRUE WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = PaperModel;
