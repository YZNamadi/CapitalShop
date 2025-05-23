const Cart = require('../models/cart');
const Order = require('../models/order');
const Product = require('../models/product');
const mongoose = require('mongoose');

// Place an order
exports.placeOrder = async (req, res) => {
  // Start a database transaction
  const session = await mongoose.startSession();
  session.startTransaction();

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
      const product = await Product.findById(productId).session(session);
      
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ error: `Product not found for ID: ${productId}` });
      }

      // Check if there is enough stock
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Not enough stock for ${product.name}` });
      }

      // Verify current price matches cart price
      if (product.price !== item.product.price) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: `Price has changed for ${product.name}. Please update your cart.` 
        });
      }

      // Deduct stock
      product.stock -= item.quantity;
      totalAmount += product.price * item.quantity;

      // Save the updated product
      await product.save({ session });

      // Add to order items
      orderItems.push({ 
        product: product._id, 
        quantity: item.quantity,
        priceAtOrder: product.price
      });
    }

    // Create the order
    const order = new Order({
      user: req.user._id,
      products: orderItems,
      totalAmount,
      status: 'pending',
      createdAt: new Date()
    });

    // Save the order
    await order.save({ session });

    // Clear the user's cart
    await Cart.findOneAndDelete({ user: req.user._id }, { session });

    // Commit the transaction
    await session.commitTransaction();

    // Respond with success message
    res.json({ 
      message: 'Order placed successfully', 
      order,
      orderNumber: order._id
    });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    console.error('Order placement failed:', error);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    session.endSession();
  }
};