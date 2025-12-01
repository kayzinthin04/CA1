// ...existing code...
const db = require('../db');

const UserModel = {
  /**
   * Get all users
   * callback(err, results)
   */
  getAll(callback) {
    const sql = 'SELECT userId, username, email, address, contact, role FROM users';
    db.query(sql, (err, results) => callback(err, results));
  },

  /**
   * Get a user by ID
   * callback(err, result)
   */
  getById(userId, callback) {
    const sql = 'SELECT userId, username, email, address, contact, role FROM users WHERE userId = ?';
    db.query(sql, [userId], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  /**
   * Add a new user
   * user: { username, email, password, address, contact, role }
   * callback(err, result)
   */
  add(user, callback) {
    // hash password using MySQL SHA1 to match your login query
    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    const params = [user.username, user.email, user.password, user.address, user.contact, user.role];
    db.query(sql, params, (err, result) => callback(err, result));
  },

  /**
   * Update an existing user
   * user: { username, email, address, contact, role }
   * callback(err, result)
   */
  update(userId, user, callback) {
    const sql = 'UPDATE users SET username = ?, email = ?, address = ?, contact = ?, role = ? WHERE userId = ?';
    const params = [user.username, user.email, user.address, user.contact, user.role, userId];
    db.query(sql, params, (err, result) => callback(err, result));
  },

  /**
   * Delete a user by ID
   * callback(err, result)
   */
  delete(userId, callback) {
    const sql = 'DELETE FROM users WHERE userId = ?';
    db.query(sql, [userId], (err, result) => callback(err, result));
  },

  /**
   * Count total users
   * callback(err, count)
   */
  countAll(callback) {
    const sql = 'SELECT COUNT(*) AS total FROM users';
    db.query(sql, (err, results) => {
      if (err) return callback(err);
      const total = results?.[0]?.total || 0;
      callback(null, total);
    });
  }
};

module.exports = UserModel;
