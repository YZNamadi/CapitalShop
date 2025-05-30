const Cart = require('../models/cart');
const Product = require('../models/product');
const Discount = require('../models/discount');
const mongoose = require('mongoose');

// Add item to cart
exports.addItemToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    console.log('Adding to cart - Product ID:', productId, 'Quantity:', quantity);
    
    if (!productId || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log('Invalid ObjectId format:', productId);
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    // Clean the ID by removing any quotes and whitespace
    const cleanProductId = productId.toString().replace(/['"]+/g, '').trim();
    console.log('Cleaned Product ID:', cleanProductId);

    // Debug: List all products in the database
    const allProducts = await Product.find({});
    console.log('Total products in database:', allProducts.length);
    console.log('Available product IDs:', allProducts.map(p => p._id.toString()));

    const product = await Product.findById(cleanProductId);
    console.log('Found product:', product);

    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found',
        debug: {
          searchedId: cleanProductId,
          totalProducts: allProducts.length,
          availableIds: allProducts.map(p => p._id.toString())
        }
      });
    }

    if (!product.isActive) {
      return res.status(400).json({ error: 'This product is no longer available' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    let cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $setOnInsert: { user: req.user._id, items: [] } },
      { new: true, upsert: true }
    );

    const itemIndex = cart.items.findIndex(item => item.product.toString() === cleanProductId);
    if (itemIndex > -1) {
      // Check if adding quantity exceeds available stock
      const newQuantity = cart.items[itemIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return res.status(400).json({ error: 'Adding this quantity would exceed available stock' });
      }
      cart.items[itemIndex].quantity = newQuantity;
    } else {
      cart.items.push({ product: cleanProductId, quantity });
    }

    await cart.save();
    
    // Populate product details before sending response
    await cart.populate('items.product');

    res.json({ 
      success: true,
      message: 'Item added to cart successfully', 
      cart 
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    res.json(cart || { items: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove item from cart
exports.removeItemFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    res.json({ message: 'Item removed from cart', cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) return res.status(404).json({ error: 'Item not in cart' });

    item.quantity = quantity;
    await cart.save();

    res.json({ message: 'Cart updated successfully', cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get total cart price
exports.getCartTotal = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) return res.json({ total: 0 });

    const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = [];
    await cart.save();

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Apply discount code
exports.applyDiscount = async (req, res) => {
  try {
    const { code } = req.body;

    const discount = await Discount.findOne({ code, isActive: true, expiresAt: { $gt: new Date() } });
    if (!discount) return res.status(400).json({ error: 'Invalid or expired discount code' });

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    let total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    if (discount.discountType === 'fixed') {
      total = Math.max(0, total - discount.amount);
    } else if (discount.discountType === 'percentage') {
      total = parseFloat((total * (1 - discount.amount / 100)).toFixed(2));
    }

    res.json({ total, discountApplied: discount.code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
