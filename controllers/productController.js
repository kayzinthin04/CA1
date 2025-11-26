const Product = require('../models/product');

const ProductController = {
  // List all products — render views instead of returning JSON
  list(req, res) {
    Product.getAll((err, results) => {
      if (err) {
        return res.status(500).render('error', { message: 'Failed to fetch products', error: err });
      }

      // pick up flag set when user added an item and clear it
      const showViewCart = !!req.session.showViewCart;
      delete req.session.showViewCart;

      // render appropriate view
      if (req.path === '/inventory' || (req.session.user && req.session.user.role === 'admin')) {
        return res.render('inventory', { products: results, user: req.session.user, showViewCart });
      }
      return res.render('shopping', { products: results, user: req.session.user, showViewCart });
    });
  },

  // Get a single product by ID — render product page or edit form
  getById(req, res) {
    const id = req.params.id || req.params.productId;
    if (!id) return res.status(400).render('error', { message: 'Product ID is required' });

    Product.getById(id, (err, product) => {
      if (err) return res.status(500).render('error', { message: 'Failed to fetch product', error: err });
      if (!product) return res.status(404).render('error', { message: 'Product not found' });

      // If route is update form, render the edit view
      if (req.path.startsWith('/updateProduct')) {
        return res.render('updateProduct', { product, user: req.session.user });
      }
      // Otherwise render product detail page
      return res.render('product', { product, user: req.session.user });
    });
  },

  // Add a new product
  add(req, res) {
    // req.file is populated by multer upload.single('image')
    const imageFilename = req.file ? req.file.filename : null;
    if (!imageFilename) {
      // handle missing file: show error or set default
      req.flash('error', 'Image upload is required');
      return res.redirect('/addProduct');
    }

    const product = {
      name: req.body.name,
      price: parseFloat(req.body.price) || 0,
      quantity: parseInt(req.body.quantity, 10) || 0,
      image: imageFilename
    };

    Product.add(product, (err, result) => {
      if (err) {
        console.error('Failed to add product', err);
        req.flash('error', 'Failed to add product');
        return res.redirect('/addProduct');
      }
      req.flash('success', 'Product added');
      res.redirect('/inventory');
    });
  },

  // Update an existing product
  update(req, res) {
    const id = req.params.id || req.params.productId;
    if (!id) {
      req.flash('error', 'Product ID is required');
      return res.redirect('/inventory');
    }

    // Debug: log incoming values
    if (process.env.NODE_ENV !== 'production') {
      console.log('UPDATE incoming params id=', id);
      console.log('UPDATE req.body =', req.body);
      console.log('UPDATE req.file =', req.file);
    }

    const imageFilename = req.file ? req.file.filename : undefined;

    const productData = {
      name: req.body.name || req.body.productName,
      price: parseFloat(req.body.price) || 0,
      quantity: parseInt(req.body.quantity, 10) || 0
    };

    if (imageFilename) productData.image = imageFilename;

    Product.update(id, productData, (err, result) => {
      if (err) {
        console.error('Failed to update product', err);
        req.flash('error', 'Failed to update product');
        return res.redirect('/inventory');
      }
      if (result && result.affectedRows === 0) {
        req.flash('error', 'Product not found');
        return res.redirect('/inventory');
      }

      // Re-fetch full product list and render inventory immediately so admin sees updated table
      Product.getAll((getErr, products) => {
        if (getErr) {
          console.error('Failed to fetch products after update', getErr);
          req.flash('error', 'Product updated but failed to reload list');
          return res.redirect('/inventory');
        }

        req.flash('success', 'Product updated');
        // render inventory with fresh data
        return res.render('inventory', { products, user: req.session.user, showViewCart: false });
      });
    });
  },

  // Delete a product
  delete(req, res) {
    const id = req.params.id || req.params.productId;
    if (!id) {
      req.flash('error', 'Product ID is required');
      return res.redirect('/inventory');
    }

    Product.delete(id, (err, result) => {
      if (err) {
        console.error('Failed to delete product', err);
        req.flash('error', 'Failed to delete product');
        return res.redirect('/inventory');
      }
      if (result.affectedRows === 0) {
        req.flash('error', 'Product not found');
        return res.redirect('/inventory');
      }

      req.flash('success', 'Product deleted');
      return res.redirect('/inventory');
    });
  }
};

module.exports = ProductController;