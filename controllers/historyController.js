const OrderModel = require('../models/order');

const HistoryController = {};

HistoryController.userHistory = (req, res) => {
  const userId = req.session.user && req.session.user.id;
  if (!userId) {
    req.flash('error', 'Please log in to view history.');
    return res.redirect('/login');
  }

  OrderModel.getUserHistory(userId, (err, orders) => {
    if (err) {
      req.flash('error', 'Unable to load order history.');
      return res.redirect('/shopping');
    }
    res.render('history', { orders, isAdminView: false });
  });
};

HistoryController.allHistory = (req, res) => {
  OrderModel.getAllHistory((err, orders) => {
    if (err) {
      req.flash('error', 'Unable to load order history.');
      return res.redirect('/shopping');
    }
    res.render('history', { orders, isAdminView: true });
  });
};

module.exports = HistoryController;
