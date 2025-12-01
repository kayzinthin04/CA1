const fs = require('fs');
const path = require('path');

const contactFile = path.join(__dirname, '..', 'data', 'contact.json');

const readContact = () => {
  try {
    const raw = fs.readFileSync(contactFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {
      email: 'support@supermarketapp.com',
      phone: '+65 6000 0000',
      address: '123 Market Street, Singapore',
      hours: 'Mon–Fri, 9am–6pm (SGT)'
    };
  }
};

const writeContact = (payload) => {
  const dir = path.dirname(contactFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(contactFile, JSON.stringify(payload, null, 2), 'utf8');
};

const ContactController = {
  view(req, res) {
    const contact = readContact();
    return res.render('contact-us', {
      contact,
      success_msg: req.flash('success'),
      error_msg: req.flash('error')
    });
  },

  update(req, res) {
    const { email, phone, address, hours } = req.body;
    if (!email || !phone || !address || !hours) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/contact-us');
    }
    writeContact({ email, phone, address, hours });
    req.flash('success', 'Contact information updated.');
    return res.redirect('/contact-us');
  }
};

module.exports = ContactController;
