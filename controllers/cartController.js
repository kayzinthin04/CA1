const ProductModel = require('../models/product');

const CartController = {};

// ===========================
// ADD TO CART
// ===========================
CartController.add = (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    if (quantity <= 0) {
        req.flash('error', 'Quantity must be at least 1.');
        return res.redirect(req.get('Referer') || '/shopping');
    }

    ProductModel.getById(productId, (err, product) => {
        if (err) {
            req.flash('error', 'Error fetching product.');
            return res.redirect('/shopping');
        }

        if (!product) {
            req.flash('error', 'Product not found.');
            return res.redirect('/shopping');
        }

        if (!req.session.cart) req.session.cart = [];

        const item = req.session.cart.find(i => i.productId === product.productId);

        let finalQty = item ? item.quantity + quantity : quantity;

        if (finalQty > product.quantity) {
            req.flash('error', `Only ${product.quantity} units available.`);
            return res.redirect(req.get('Referer') || '/shopping');
        }

        if (item) {
            item.quantity = finalQty;
        } else {
            req.session.cart.push({
                productId: product.productId,
                productName: product.name || product.productName,
                price: product.price,
                quantity: quantity,
                image: product.image,
                quantityAvailable: product.quantity
            });
        }

        req.flash('success', `${quantity} unit(s) of ${product.name} added to cart.`);
        res.redirect(req.get('Referer') || '/shopping');
    });
};

// ===========================
// VIEW CART
// ===========================
CartController.view = (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart });
};

// ===========================
// UPDATE CART QUANTITIES
// ===========================
CartController.update = (req, res) => {
    if (!req.session.cart) {
        req.flash('success', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    const quantities = req.body.quantities || {};
    const messages = [];

    req.session.cart.forEach((item, idx) => {
        const value =
            quantities[idx] ||
            quantities[String(idx)] ||
            quantities[item.productId] ||
            quantities[item.productId + ''];

        const requestedQty = parseInt(value, 10);

        if (!Number.isNaN(requestedQty) && requestedQty >= 0) {

            if (requestedQty === 0) {
                item.quantity = 0;
                messages.push(`Removed "${item.productName}" from cart.`);
            } else if (requestedQty > item.quantityAvailable) {
                messages.push(
                    `Cannot set "${item.productName}" to ${requestedQty}. Only ${item.quantityAvailable} available.`
                );
                item.quantity = item.quantityAvailable;
            } else {
                item.quantity = requestedQty;
            }
        }
    });

    req.session.cart = req.session.cart.filter(i => i.quantity > 0);

    if (messages.length > 0) req.flash('error', messages);

    res.redirect('/cart');
};

// ===========================
// REMOVE ITEM
// ===========================
CartController.remove = (req, res) => {
    const idx = parseInt(req.params.idx, 10);

    if (!req.session.cart || Number.isNaN(idx)) {
        req.flash('error', 'Invalid cart index.');
        return res.redirect('/cart');
    }

    if (idx >= 0 && idx < req.session.cart.length) {
        req.session.cart.splice(idx, 1);
        req.flash('success', 'Item removed from cart.');
    } else {
        req.flash('error', 'Could not remove item.');
    }

    res.redirect('/cart');
};

module.exports = CartController;
