// controllers/paperController.js
const PaperModel      = require('../models/paperModel');
const AssignmentModel = require('../models/assignmentModel');
const ReviewModel     = require('../models/reviewModel');

/** GET /api/papers  – Reviewer gets their assigned papers; Admin gets all */
exports.list = async (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 10 } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    if (req.user.role === 'admin') {
      const result = await PaperModel.findAll({ search, page: pageNum, limit: limitNum });
      return res.json({ ...result, page: pageNum, limit: limitNum });
    }

    const result = await PaperModel.findByReviewer({
      reviewerId: req.user.id,
      search,
      status,
      page: pageNum,
      limit: limitNum,
    });
    res.json({ ...result, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Paper list error:', err);
    res.status(500).json({ message: 'Failed to fetch papers' });
  }
};

/** GET /api/papers/:id */
exports.getOne = async (req, res) => {
  try {
    const paper = await PaperModel.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    // Reviewer must be assigned
    if (req.user.role === 'reviewer') {
      const assigned = await AssignmentModel.exists(paper.id, req.user.id);
      if (!assigned) return res.status(403).json({ message: 'Not assigned to this paper' });
    }

    // Include assignments + reviews for admin
    if (req.user.role === 'admin') {
      const [assignments, reviews] = await Promise.all([
        AssignmentModel.findByPaper(paper.id),
        ReviewModel.findByPaper(paper.id),
      ]);
      return res.json({ paper, assignments, reviews });
    }

    // Reviewer: include their review
    const review = await ReviewModel.findByPaperAndReviewer(paper.id, req.user.id);
    res.json({ paper, review });
  } catch (err) {
    console.error('Get paper error:', err);
    res.status(500).json({ message: 'Failed to fetch paper' });
  }
};

/** POST /api/papers  (admin only) */
exports.create = async (req, res) => {
  try {
    const { title, abstract, authors, deadline } = req.body;
    const pdf_filename = req.file ? req.file.filename : null;

    const paper = await PaperModel.create({
      title, abstract, authors, deadline,
      pdf_filename,
      submitted_by: req.user.id,
    });

    // Email simulation
    console.log(`📧  [EMAIL SIM] New paper "${title}" added to system`);

    res.status(201).json({ message: 'Paper created', paper });
  } catch (err) {
    console.error('Create paper error:', err);
    res.status(500).json({ message: 'Failed to create paper' });
  }
};

/** PUT /api/papers/:id  (admin only) */
exports.update = async (req, res) => {
  try {
    const allowed  = ['title', 'abstract', 'authors', 'deadline'];
    const fields   = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) fields[f] = req.body[f]; });

    if (req.file) fields.pdf_filename = req.file.filename;

    const paper = await PaperModel.update(req.params.id, fields);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    res.json({ message: 'Paper updated', paper });
  } catch (err) {
    console.error('Update paper error:', err);
    res.status(500).json({ message: 'Failed to update paper' });
  }
};

/** DELETE /api/papers/:id  (admin only – soft delete) */
exports.remove = async (req, res) => {
  try {
    const paper = await PaperModel.softDelete(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    res.json({ message: 'Paper deleted' });
  } catch (err) {
    console.error('Delete paper error:', err);
    res.status(500).json({ message: 'Failed to delete paper' });
  }
};

/** POST /api/papers/:id/assign  (admin only) */
exports.assign = async (req, res) => {
  try {
    const { reviewer_id } = req.body;
    if (!reviewer_id) return res.status(400).json({ message: 'reviewer_id required' });

    const paper = await PaperModel.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    const assignment = await AssignmentModel.create(paper.id, reviewer_id);

    // Email simulation
    console.log(`📧  [EMAIL SIM] Reviewer #${reviewer_id} assigned to paper "${paper.title}"`);

    res.status(201).json({ message: 'Reviewer assigned', assignment });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ message: 'Failed to assign reviewer' });
  }
};

/** DELETE /api/papers/:id/assign/:reviewerId  (admin only) */
exports.unassign = async (req, res) => {
  try {
    const result = await AssignmentModel.remove(req.params.id, req.params.reviewerId);
    if (!result) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Reviewer unassigned' });
  } catch (err) {
    console.error('Unassign error:', err);
    res.status(500).json({ message: 'Failed to remove assignment' });
  }
};
