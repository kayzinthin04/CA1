// Simple in-memory feedback store. In production, persist to a database.
const submissions = [];

const FeedbackController = {
  form(req, res) {
    res.render('contact', {
      success_msg: req.flash('success'),
      error_msg: req.flash('error')
    });
  },

  submit(req, res) {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      req.flash('error', 'Please fill in all fields.');
      return res.redirect('/feedback');
    }

    const entry = {
      id: submissions.length + 1,
      name,
      email,
      message,
      status: 'Submitted',
      createdAt: new Date()
    };
    submissions.push(entry);
    req.flash('success', 'Thanks for your feedback! We have received your message.');
    return res.redirect('/feedback');
  },

  status(req, res) {
    res.render('feedback-status', {
      submissions,
      success_msg: req.flash('success'),
      error_msg: req.flash('error')
    });
  },

  publicList(req, res) {
    const publicView = submissions.map(({ id, message, status, createdAt, name }) => ({
      id,
      name,
      message,
      status,
      createdAt
    }));
    res.render('feedback-public', {
      submissions: publicView,
      success_msg: req.flash('success'),
      error_msg: req.flash('error')
    });
  }
};

module.exports = FeedbackController;
