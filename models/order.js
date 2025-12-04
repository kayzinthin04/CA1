const db = require('../db');

const OrderModel = {};

// Ensure order tables exist; lightweight guard to avoid manual migrations.
OrderModel.ensureTables = (cb = () => {}) => {
  const createOrders = `
    CREATE TABLE IF NOT EXISTS orders (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      username VARCHAR(100) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createOrderItems = `
    CREATE TABLE IF NOT EXISTS order_items (
      id INT NOT NULL AUTO_INCREMENT,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      PRIMARY KEY (id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  db.query(createOrders, (err) => {
    if (err) return cb(err);
    db.query(createOrderItems, cb);
  });
};

OrderModel.addOrder = (user, items, total, cb) => {
  OrderModel.ensureTables((ensureErr) => {
    if (ensureErr) return cb(ensureErr);

    const orderSql = 'INSERT INTO orders (user_id, username, total) VALUES (?, ?, ?)';
    db.query(orderSql, [user.id, user.username, total], (err, result) => {
      if (err) return cb(err);

      const orderId = result.insertId;
      if (!items || items.length === 0) return cb(null, { orderId, items: [] });

      const values = items.map(it => [
        orderId,
        it.productId,
        it.productName || it.product_id_name || '',
        it.price,
        it.quantity
      ]);

      const itemSql = `
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES ?
      `;

      db.query(itemSql, [values], (itemErr) => {
        if (itemErr) return cb(itemErr);
        cb(null, { orderId, items });
      });
    });
  });
};

const mapOrdersWithItems = (rows) => {
  const map = {};
  rows.forEach(row => {
    if (!map[row.order_id]) {
      map[row.order_id] = {
        orderId: row.order_id,
        username: row.username,
        userId: row.user_id,
        total: Number(row.total),
        created_at: row.created_at,
        items: []
      };
    }
    map[row.order_id].items.push({
      productId: row.product_id,
      productName: row.product_name,
      price: Number(row.price),
      quantity: row.quantity
    });
  });
  return Object.values(map).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

OrderModel.getUserHistory = (userId, cb) => {
  OrderModel.ensureTables((ensureErr) => {
    if (ensureErr) return cb(ensureErr);
    const sql = `
      SELECT o.id AS order_id, o.user_id, o.username, o.total, o.created_at,
             oi.product_id, oi.product_name, oi.price, oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, oi.id ASC
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err) return cb(err);
      cb(null, mapOrdersWithItems(rows));
    });
  });
};

OrderModel.getAllHistory = (cb) => {
  OrderModel.ensureTables((ensureErr) => {
    if (ensureErr) return cb(ensureErr);
    const sql = `
      SELECT o.id AS order_id, o.user_id, o.username, o.total, o.created_at,
             oi.product_id, oi.product_name, oi.price, oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ORDER BY o.created_at DESC, oi.id ASC
    `;
    db.query(sql, (err, rows) => {
      if (err) return cb(err);
      cb(null, mapOrdersWithItems(rows));
    });
  });
};

module.exports = OrderModel;
