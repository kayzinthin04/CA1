const db = require('../db'); // ensure db is required at top if not already

module.exports = {
  /**
   * Get all products
   * callback(err, results)
   */
  getAll(callback) {
    const sql = 'SELECT productId, name, quantity, price, image FROM products';
    db.query(sql, (err, results) => callback(err, results));
  },

  /**
   * Get a product by ID
   * callback(err, result)
   */
  getById(productId, callback) {
    const sql = 'SELECT productId, name, quantity, price, image FROM products WHERE productId = ?';
    db.query(sql, [productId], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  /**
   * Add a new product
   * product: { name, quantity, price, image }
   * callback(err, result)
   */
  add(product, callback) {
    const sql = 'INSERT INTO products (name, quantity, price, image) VALUES (?, ?, ?, ?)';
    const params = [product.name, product.quantity, product.price, product.image];
    db.query(sql, params, (err, result) => callback(err, result));
  },

  /**
   * Update an existing product
   * product: { name, quantity, price, image }
   * callback(err, result)
   */
  update(productId, product, callback) {
    const sql = 'UPDATE products SET name = ?, quantity = ?, price = ?, image = ? WHERE productId = ?';
    const params = [product.name, product.quantity, product.price, product.image, productId];
    db.query(sql, params, (err, result) => callback(err, result));
  },

  /**
   * Delete a product by ID
   * callback(err, result)
   */
  delete(productId, callback) {
    const sql = 'DELETE FROM products WHERE productId = ?';
    db.query(sql, [productId], (err, result) => callback(err, result));
  },

  /**
   * Decrease quantity of a product
   * productId: ID of the product
   * amount: amount to decrease
   * callback(err, result)
   */
  decreaseQuantity(productId, amount, callback) {
    const id = Number(productId);
    const qty = Number(amount) || 0;
    if (Number.isNaN(id) || qty <= 0) return callback(new Error('Invalid arguments'));

    // 1) Check current stock
    const sel = 'SELECT quantity FROM products WHERE productId = ? LIMIT 1';
    db.query(sel, [id], (selErr, rows) => {
      if (selErr) return callback(selErr);
      if (!rows || rows.length === 0) return callback(new Error('Product not found'));
      const current = Number(rows[0].quantity) || 0;
      if (current < qty) return callback(Object.assign(new Error('Insufficient stock'), { code: 'INSUFFICIENT_STOCK', available: current }));

      // 2) Safe update
      const upd = 'UPDATE products SET quantity = quantity - ? WHERE productId = ?';
      db.query(upd, [qty, id], (updErr, result) => {
        if (updErr) return callback(updErr);
        return callback(null, result);
      });
    });
  }
};