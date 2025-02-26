
// const Cart = require('../models/Cart');
// const Order = require('../models/Order');
// const Product = require('../models/Product');

// // Place an order
// exports.placeOrder = async (req, res) => {
//   try {
//     const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ error: 'Cart is empty' });
//     }

//     let totalAmount = 0;
//     const orderItems = cart.items.map(async (item) => {
//       const product = item.product;
//       if (product.stock < item.quantity) {
//         throw new Error(`Not enough stock for ${product.name}`);
//       }
//       totalAmount += product.price * item.quantity;

//       product.stock -= item.quantity;
//       await product.save();

//       return { product: product._id, quantity: item.quantity };
//     });

//     await Promise.all(orderItems);

//     const order = new Order({
//       user: req.user._id,
//       products: orderItems,
//       totalAmount,
//     });
//     await order.save();

//     await Cart.findOneAndDelete({ user: req.user._id });

//     res.json({ message: 'Order placed successfully', order });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };



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
    const orderItemsPromises = cart.items.map(async (item) => {
      const product = item.product;

      // Check if there is enough stock
      if (product.stock < item.quantity) {
        throw new Error(`Not enough stock for ${product.name}`);
      }

      // Deduct stock and calculate total amount
      product.stock -= item.quantity;
      totalAmount += product.price * item.quantity;

      // Save the updated product
      await product.save();

      // Return the order item object
      return { product: product._id, quantity: item.quantity };
    });

    // Resolve all promises to get the final order items
    const orderItems = await Promise.all(orderItemsPromises);

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
    // Handle errors and rollback changes if necessary
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
