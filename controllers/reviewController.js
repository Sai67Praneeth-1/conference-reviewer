// controllers/reviewController.js
const ReviewModel     = require('../models/reviewModel');
const AssignmentModel = require('../models/assignmentModel');

/** GET /api/papers/:paperId/review  – Get reviewer's own review */
exports.getReview = async (req, res) => {
  try {
    const review = await ReviewModel.findByPaperAndReviewer(
      req.params.paperId,
      req.user.id
    );
    res.json({ review: review || null });
  } catch (err) {
    console.error('Get review error:', err);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
};

/** PUT /api/papers/:paperId/review  – Save draft or submit */
exports.saveReview = async (req, res) => {
  try {
    const paperId    = parseInt(req.params.paperId, 10);
    const reviewerId = req.user.id;

    // Ensure reviewer is assigned
    const assigned = await AssignmentModel.exists(paperId, reviewerId);
    if (!assigned) {
      return res.status(403).json({ message: 'Not assigned to this paper' });
    }

    // Prevent editing a submitted review
    const existing = await ReviewModel.findByPaperAndReviewer(paperId, reviewerId);
    if (existing && existing.status === 'submitted') {
      return res.status(409).json({ message: 'Review already submitted – cannot edit' });
    }

    const { score, comments, recommendation, status } = req.body;

    // If submitting, all fields are required
    if (status === 'submitted') {
      if (!score || !recommendation) {
        return res.status(422).json({ message: 'Score and recommendation required to submit' });
      }
    }

    const review = await ReviewModel.upsert({
      paperId, reviewerId, score, comments, recommendation, status,
    });

    if (status === 'submitted') {
      console.log(`📧  [EMAIL SIM] Review submitted for paper #${paperId} by reviewer #${reviewerId}`);
    }

    res.json({ message: status === 'submitted' ? 'Review submitted' : 'Draft saved', review });
  } catch (err) {
    console.error('Save review error:', err);
    res.status(500).json({ message: 'Failed to save review' });
  }
};

/** GET /api/papers/:paperId/reviews  (admin only) */
exports.listForPaper = async (req, res) => {
  try {
    const reviews = await ReviewModel.findByPaper(req.params.paperId);
    res.json({ reviews });
  } catch (err) {
    console.error('List reviews error:', err);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};
