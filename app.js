const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();
const dotenv = require('dotenv');
dotenv.config({ debug: false }); // disable dotenv debug/info

// MVC controllers (per request)
const ProductController = require('./controllers/productController');
const UserController = require('./controllers/userController');

// Models (used for internal logic like add-to-cart)
const ProductModel = require('./models/product');
const UserModel = require('./models/user');

// Shared DB wrapper (remove direct connection creation)
const db = require('./db');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Set up view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;
    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// -- keep only ONE /cart/update route (place after auth middlewares) --
app.post('/cart/update', checkAuthenticated, (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('POST /cart/update body =', req.body);
  }

  // normalize quantities from different form-parsing shapes
  let quantities = {};
  if (req.body.quantities && typeof req.body.quantities === 'object') {
    quantities = req.body.quantities;
  } else {
    // handle keys like "quantities[0]" or "quantities[productId]"
    Object.keys(req.body).forEach(k => {
      const m = k.match(/^quantities(?:\[(.+?)\])?$/);
      if (m) {
        const key = m[1] ?? Object.keys(quantities).length;
        quantities[key] = req.body[k];
      }
    });
  }

  if (!req.session.cart) return res.redirect('/cart');

  req.session.cart.forEach((item, idx) => {
    // support numeric index and productId keys
    const v = quantities[idx] ?? quantities[String(idx)] ?? quantities[item.productId] ?? quantities[item.productId + ''];
    const q = parseInt(v, 10);
    if (!Number.isNaN(q) && q > 0) item.quantity = q;
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('Updated session.cart =', req.session.cart);
  }
  res.redirect('/cart');
});

// Remove one item from cart by index (must be registered before app.listen)
// FIX: Changed from app.post to app.get to match the new <a> link in cart.ejs
app.get('/cart/remove/:idx', checkAuthenticated, (req, res) => {
  const idx = parseInt(req.params.idx, 10);

  if (!req.session.cart || Number.isNaN(idx)) {
    // Note: If cart is already empty, this success message is misleading, but kept for logic consistency.
    req.flash('success', 'Your cart was updated.'); 
    return res.redirect('/cart');
  }

  if (idx >= 0 && idx < req.session.cart.length) {
    req.session.cart.splice(idx, 1);
  }

  req.flash('success', 'Item removed from cart.');
  res.redirect('/cart');
});


// Routes

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// Products - use ProductController for CRUD/list/view operations
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.list);
app.get('/shopping', checkAuthenticated, ProductController.list);
app.get('/product/:id', checkAuthenticated, ProductController.getById);

// Render add form (no DB access required)
app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', { user: req.session.user });
});

// Create product (with file upload) -> handled by controller
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.add);

// Render update form: delegate to controller to fetch and render if implemented;
// if controller.getById renders the update view, use it; otherwise controller.getById can be adapted.
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, ProductController.getById);

// Update product (with optional file upload)
app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.update);

// Delete product
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.delete);

// Add to cart uses model to fetch product (no direct SQL connection here)
app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    ProductModel.getById(productId, (err, product) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching product');
        }
        if (!product) return res.status(404).send('Product not found');

        if (!req.session.cart) req.session.cart = [];

        const existingItem = req.session.cart.find(item => item.productId === product.productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            req.session.cart.push({
                productId: product.productId,
                productName: product.name || product.productName,
                price: product.price,
                quantity: quantity,
                image: product.image
            });
        }

        // Show View Cart button on the shopping page instead of immediate redirect
        req.session.showViewCart = true;
        // Redirect back to the referring page (shopping) so user stays on products list
        res.redirect(req.get('Referer') || '/shopping');
    });
});

app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    const messages = req.flash('success');
    res.render('cart', { cart, user: req.session.user, messages });
});

// Checkout page (render with message when cart is empty)
app.get('/checkout', checkAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  if (!cart || cart.length === 0) {
    // render checkout with an explicit in-page error message
    return res.render('checkout', {
      cart: [],
      total: 0,
      user: req.session.user,
      messages: ['You have not added any product to the cart.']
    });
  }
  const total = cart.reduce((s, it) => s + (Number(it.price) * Number(it.quantity)), 0);
  res.render('checkout', { cart, total, user: req.session.user, messages: [] });
});

// Confirm order (POST) — also guard empty cart and render same view with message
app.post('/checkout/confirm', checkAuthenticated, async (req, res) => {
  const cart = req.session.cart || [];
  if (!cart || cart.length === 0) {
    return res.render('checkout', {
      cart: [],
      total: 0,
      user: req.session.user,
      messages: ['You have not added any product to the cart.']
    });
  }

  const total = cart.reduce((s, it) => s + (Number(it.price) * Number(it.quantity)), 0);

  try {
    // Update DB stock for each cart item
    await Promise.all(cart.map(item => {
      return new Promise((resolve, reject) => {
        ProductModel.decreaseQuantity(item.productId, item.quantity, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
    }));

    // All stock updates succeeded -> create order, clear cart
    const order = {
      id: Date.now(),
      items: cart,
      total,
      createdAt: new Date()
    };
    req.session.lastOrder = order;
    delete req.session.cart;
    res.redirect('/order-confirmation');
  } catch (err) {
    console.error('Checkout failed updating stock:', err);
    // If insufficient stock, show specific message; otherwise generic error
    const msg = (err && err.code === 'INSUFFICIENT_STOCK') ?
      `Not enough stock for one of the items (available: ${err.available || 0}).` :
      'Failed to complete order. Please try again.';
    return res.render('checkout', {
      cart,
      total,
      user: req.session.user,
      messages: [msg]
    });
  }
});

app.get('/order-confirmation', checkAuthenticated, (req, res) => {
  if (!req.session.lastOrder) return res.redirect('/shopping');
  res.render('order-confirmation', { order: req.session.lastOrder, user: req.session.user });
});

// Users - use UserController for CRUD/list/view/add/update/delete
app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});
app.post('/register', validateRegistration, UserController.add);

// Login still uses DB wrapper (db) to authenticate
app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error(err);
            req.flash('error', 'An error occurred');
            return res.redirect('/login');
        }

        if (results.length > 0) {
            // Successful login
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            if (req.session.user.role === 'user') res.redirect('/shopping');
            else res.redirect('/inventory');
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Example user CRUD routes (controllers should handle rendering/redirecting)
app.get('/users', checkAuthenticated, checkAdmin, UserController.list);
app.get('/users/:id', checkAuthenticated, checkAdmin, UserController.getById);
app.post('/users', checkAuthenticated, checkAdmin, UserController.add);
app.post('/users/:id', checkAuthenticated, checkAdmin, UserController.update);
app.get('/users/delete/:id', checkAuthenticated, checkAdmin, UserController.delete);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));