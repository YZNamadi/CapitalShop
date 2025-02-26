
const Cart = require('../models/cart');
const Product = require('../models/product');

// Add item to cart
exports.addItemToCart = async (req, res) => {
  try {
    const { productId, quantity }= req.body;
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $push: { items: { product: productId, quantity } } },
      { upsert: true, new: true }
    );
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) return res.json({ items: [] });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeItemFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



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

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
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
      total = total * (1 - discount.amount / 100);
    }

    res.json({ total, discountApplied: discount.code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};