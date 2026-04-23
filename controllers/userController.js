// controllers/userController.js  (admin only)
const UserModel = require('../models/userModel');
const bcrypt    = require('bcrypt');

/** GET /api/users  – list all reviewers */
exports.list = async (req, res) => {
  try {
    const reviewers = await UserModel.listReviewers();
    res.json({ reviewers });
  } catch (err) {
    console.error('User list error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

/** GET /api/users/:id */
exports.getOne = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

/** DELETE /api/users/:id  (soft delete) */
exports.remove = async (req, res) => {
  try {
    if (parseInt(req.params.id, 10) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    const user = await UserModel.softDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};
