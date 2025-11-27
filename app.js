const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();

// =============================
// VIEW ENGINE + STATIC FILES
// =============================
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =============================
// SESSION + FLASH
// =============================
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Inject flash + user into every EJS view
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

// =============================
// MULTER FILE UPLOAD
// =============================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/images'));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// =============================
// AUTH MIDDLEWARE
// =============================
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in to continue.');
    res.redirect('/login');
};

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    req.flash('error', 'Access denied.');
    res.redirect('/shopping');
};

const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    next();
};

// =============================
// CONTROLLERS
// =============================
const ProductController = require('./controllers/productController');
const UserController = require('./controllers/userController');
const CartController = require('./controllers/cartController');
const CheckoutController = require('./controllers/checkoutController');

// =============================
// HOME ROUTE
// =============================
app.get('/', (req, res) => res.render('index'));

// =============================
// PRODUCT ROUTES
// =============================
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.list);
app.get('/shopping', checkAuthenticated, ProductController.list);
app.get('/product/:id', checkAuthenticated, ProductController.getById);

app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct');
});

app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.add);

app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, ProductController.getById);

app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.update);

app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.delete);

// =============================
// CART ROUTES
// =============================
app.post('/add-to-cart/:id', checkAuthenticated, CartController.add);
app.get('/cart', checkAuthenticated, CartController.view);
app.post('/cart/update', checkAuthenticated, CartController.update);
app.get('/cart/remove/:idx', checkAuthenticated, CartController.remove);

// =============================
// CHECKOUT ROUTES
// =============================
app.get('/checkout', checkAuthenticated, CheckoutController.view);
app.post('/checkout/confirm', checkAuthenticated, CheckoutController.confirm);
app.get('/order-confirmation', checkAuthenticated, CheckoutController.orderConfirmation);

// =============================
// AUTH ROUTES
// =============================
app.get('/register', (req, res) => {
    res.render('register', { formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, UserController.add);

app.get('/login', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'Email and password are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';

    db.query(sql, [email, password], (err, results) => {
        if (err) {
            req.flash('error', 'Internal error occurred.');
            return res.redirect('/login');
        }

        if (results.length === 0) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        req.session.user = results[0];

        if (req.session.user.role === 'admin') {
            return res.redirect('/inventory');
        }
        return res.redirect('/shopping');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// =============================
// ADMIN USER ROUTES
// =============================
app.get('/users', checkAuthenticated, checkAdmin, UserController.list);
app.get('/users/delete/:id', checkAuthenticated, checkAdmin, UserController.delete);
app.get('/users/:id', checkAuthenticated, checkAdmin, UserController.getById);
app.post('/users', checkAuthenticated, checkAdmin, UserController.add);
app.post('/users/:id', checkAuthenticated, checkAdmin, UserController.update);

// =============================
// SERVER
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
