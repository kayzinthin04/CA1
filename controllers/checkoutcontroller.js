const ProductModel = require('../models/product');
const OrderModel = require('../models/order');

const CheckoutController = {};

// ===========================
// VIEW CHECKOUT PAGE
// ===========================
CheckoutController.view = (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (cart.length === 0) {
        return res.render('checkout', {
            cart: [],
            total: 0,
            checkout_messages: ['You have not added any product to the cart.']
        });
    }

    res.render('checkout', {
        cart,
        total,
        checkout_messages: res.locals.error_msg
    });
};

// ===========================
// CONFIRM ORDER
// ===========================
CheckoutController.confirm = async (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((s, it) => s + it.price * it.quantity, 0);

    if (cart.length === 0) {
        return res.render('checkout', {
            cart: [],
            total: 0,
            checkout_messages: ['You have not added any product to the cart.']
        });
    }

    try {
        await Promise.all(
            cart.map(item => {
                return new Promise((resolve, reject) => {
                    ProductModel.decreaseQuantity(item.productId, item.quantity, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            })
        );

        OrderModel.addOrder(req.session.user, cart, total, (orderErr, saved) => {
            if (orderErr) {
                req.flash('error', 'Order was charged but could not be saved to history.');
                return res.redirect('/checkout');
            }

            const order = {
                id: saved.orderId,
                items: cart,
                total,
                createdAt: new Date(),
                user: req.session.user.username
            };

            req.session.lastOrder = order;
            delete req.session.cart;

            req.flash('success', 'Your order has been placed successfully!');
            res.redirect('/order-confirmation');
        });

    } catch (err) {
        const msg =
            err && err.code === 'INSUFFICIENT_STOCK'
                ? 'Not enough stock for one of the items.'
                : 'Failed to complete order. Please try again.';

        req.flash('error', msg);
        res.redirect('/checkout');
    }
};

// ===========================
// ORDER CONFIRMATION PAGE
// ===========================
CheckoutController.orderConfirmation = (req, res) => {
    if (!req.session.lastOrder) {
        req.flash('error', 'No recent order found.');
        return res.redirect('/shopping');
    }

    res.render('order-confirmation', { order: req.session.lastOrder });
};

module.exports = CheckoutController;
