const User = require('../models/user');

const UserController = {
  // List all users
  list(req, res) {
    User.getAll((err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
      return res.status(200).json(results);
    });
  },

  // Get a single user by ID
  getById(req, res) {
    const id = req.params.id || req.params.userId;
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    User.getById(id, (err, user) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch user', details: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(user);
    });
  },

  // Add a new user
  add(req, res) {
    const user = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      address: req.body.address,
      contact: req.body.contact,
      role: req.body.role || 'user'
    };

    if (!user.password) {
      req.flash('error', 'Password is required');
      req.flash('formData', req.body);
      return res.redirect('/register');
    }

    User.add(user, (err, result) => {
      if (err) {
        req.flash('error', 'Failed to add user');
        req.flash('formData', req.body);
        return res.redirect('/register');
      }
      req.flash('success', 'Registration successful. Please log in.');
      return res.redirect('/login');
    });
  },

  // Update an existing user
  update(req, res) {
    const id = req.params.id || req.params.userId;
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    const user = {
      username: req.body.username,
      email: req.body.email,
      address: req.body.address,
      contact: req.body.contact,
      role: req.body.role
    };

    User.update(id, user, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to update user', details: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ message: 'User updated' });
    });
  },

  // Delete a user
  delete(req, res) {
    const id = req.params.id || req.params.userId;
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    User.delete(id, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to delete user', details: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ message: 'User deleted' });
    });
  }
};

module.exports = UserController;