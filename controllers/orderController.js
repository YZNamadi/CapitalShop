const Cart = require('../models/cart');
const Order = require('../models/order');
const Product = require('../models/product');

// Place an order
exports.placeOrder = async (req, res) => {
  try {
    // Find the user's cart and populate product details
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Process each item in the cart
    for (const item of cart.items) {
      const productId = item.product;
const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found for ID: ${productId}` });
      }
      // Check if there is enough stock
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Not enough stock for ${product.name}` });
      }

      // Deduct stock
      product.stock -= item.quantity;
      totalAmount += product.price * item.quantity;

      // Save the updated product
      await product.save();

      // Add to order items
      orderItems.push({ product: product._id, quantity: item.quantity });
    }

    // Create the order
    const order = new Order({
      user: req.user._id,
      products: orderItems,
      totalAmount,
    });

    // Save the order
    await order.save();

    // Clear the user's cart
    await Cart.findOneAndDelete({ user: req.user._id });

    // Respond with success message
    res.json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to place order' });
  }
};