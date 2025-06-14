const cloudinary = require('../cloudinaryConfig');
const Product = require('../models/product');
const fs = require('fs');
const createError = require('../utils/error');
const mongoose = require('mongoose');
const Category = require('../models/category');
const Cart = require('../models/cart');
const Order = require('../models/order');

// Cache durations
const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400 // 24 hours
};

// Utility function to set cache headers
const setCacheHeader = (res, duration) => {
  res.set('Cache-Control', `public, max-age=${duration}`);
};

// Utility function to handle Cloudinary upload
const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'image',
      folder: 'capital_shop/products',
    });
    fs.unlinkSync(file.path); // Remove temp file
    return result.secure_url;
  } catch (error) {
    fs.unlinkSync(file.path); // Clean up on error
    throw new Error('Failed to upload image');
  }
};

// Create product
exports.createProduct = async (req, res, next) => {
  try {
    console.log('Starting product creation...');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    if (!req.file) {
      return next(createError(400, 'Product image is required'));
    }

    // Validate required fields
    const requiredFields = ['name', 'price', 'description', 'category'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.log(`Missing required field: ${field}`);
        return next(createError(400, `${field} is required`));
      }
    }

    // Validate price is a number
    const price = parseFloat(req.body.price);
    if (isNaN(price) || price < 0) {
      console.log('Invalid price:', req.body.price);
      return next(createError(400, 'Price must be a valid positive number'));
    }

    // Validate category exists
    const category = await Category.findById(req.body.category);
    if (!category) {
      return next(createError(400, 'Invalid category'));
    }

    // Upload image to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file);

    // Create product
    const product = new Product({
      name: req.body.name,
      price: price,
      description: req.body.description,
      category: req.body.category,
      image: imageUrl,
      stock: req.body.stock || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    await product.save();
    await product.populate('category');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Create product error:', error);
    next(createError(500, 'Failed to create product'));
  }
};

// Get all products with pagination, sorting, and filtering
exports.getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    // Price filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Category filter
    if (req.query.category) {
      const category = await Category.findById(req.query.category);
      if (!category) {
        return next(createError(400, 'Invalid category ID'));
      }
      query.category = category._id;
    }

    // Stock filter
    if (req.query.inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Active filter (optional)
    if (req.query.active) {
      query.isActive = req.query.active === 'true';
    }

    // Rating filter
    if (req.query.minRating) {
      query.averageRating = { $gte: parseFloat(req.query.minRating) };
    }

    // Build sort options
    let sortOptions = {};
    switch (req.query.sort) {
      case 'price_asc':
        sortOptions.price = 1;
        break;
      case 'price_desc':
        sortOptions.price = -1;
        break;
      case 'name_asc':
        sortOptions.name = 1;
        break;
      case 'name_desc':
        sortOptions.name = -1;
        break;
      case 'rating_desc':
        sortOptions.averageRating = -1;
        break;
      default:
        sortOptions = { createdAt: -1 }; // Default sort by newest
    }

    console.log('Query:', query);

    const products = await Product.find(query)
      .populate('category')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select('-ratings');

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        products,
        currentPage: page,
        totalPages,
        totalProducts: total
      }
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Get product by ID
exports.getProductById = async (req, res, next) => {
  try {
    console.log('Getting product by ID:', req.params.id);
    
    // Clean the ID by removing any quotes and whitespace
    const cleanId = req.params.id.replace(/['"]+/g, '').trim();
    console.log('Cleaned ID:', cleanId);
    
    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      console.log('Invalid ObjectId format');
      return next(createError(400, 'Invalid product ID format'));
    }

    const product = await Product.findById(cleanId);
    console.log('Found product:', product);
    
    if (!product) {
      console.log('Product not found');
      return next(createError(404, 'Product not found'));
    }

    // Set cache header for individual products
    setCacheHeader(res, CACHE_DURATIONS.MEDIUM);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error getting product by ID:', error);
    next(createError(500, 'Error retrieving product: ' + error.message));
  }
};

// Add or update product rating
exports.rateProduct = async (req, res, next) => {
  try {
    const { rating, review } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return next(createError(400, 'Rating must be between 1 and 5'));
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    // Find existing rating
    const existingRatingIndex = product.ratings.findIndex(
      r => r.user.toString() === userId
    );

    if (existingRatingIndex > -1) {
      // Update existing rating
      product.ratings[existingRatingIndex].rating = rating;
      product.ratings[existingRatingIndex].review = review;
      product.ratings[existingRatingIndex].date = Date.now();
    } else {
      // Add new rating
      product.ratings.push({
        user: userId,
        rating,
        review,
      });
    }

    await product.calculateAverageRating();

    res.json({
      success: true,
      message: 'Rating updated successfully',
      data: {
        averageRating: product.averageRating,
        numReviews: product.numReviews
      }
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Update product
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    let imageUrl = product.image;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file);
    }

    // Update fields if provided
    const updates = {
      name: req.body.name,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      description: req.body.description,
      category: req.body.category ? req.body.category.toLowerCase() : undefined,
      stock: req.body.stock ? parseInt(req.body.stock) : undefined,
      image: imageUrl,
      isActive: req.body.isActive !== undefined ? req.body.isActive : undefined
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    next(createError(error.statusCode || 500, error.message));
  }
};

// Delete product
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    // Soft delete by setting isActive to false
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q: searchQuery } = req.query;
    if (!searchQuery) {
      return next(createError(400, 'Search query is required'));
    }

    const products = await Product.find({
      isActive: true,
      $text: { $search: searchQuery }
    })
    .select('-ratings')
    .sort({ score: { $meta: 'textScore' } });

    // Set short cache for search results
    setCacheHeader(res, CACHE_DURATIONS.SHORT);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Get product categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });

    // Set long cache for categories as they change infrequently
    setCacheHeader(res, CACHE_DURATIONS.VERY_LONG);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.category;
    
    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return next(createError(404, 'Category not found'));
    }

    // Get all subcategories of this category
    const subcategories = await Category.find({ parent: categoryId });
    const categoryIds = [categoryId, ...subcategories.map(sub => sub._id)];

    const products = await Product.find({
      category: { $in: categoryIds },
      isActive: true
    })
    .populate('category')
    .select('-ratings')
    .sort({ createdAt: -1 });

    console.log(`Found ${products.length} products in category: ${category.name}`);

    res.json({
      success: true,
      data: {
        category: category.name,
        products,
        count: products.length
      }
    });
  } catch (error) {
    console.error('Error getting products by category:', error);
    next(createError(500, 'Error retrieving products'));
  }
};

// Get recommended products based on cart items
exports.getRecommendedProducts = async (req, res, next) => {
  try {
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart || !cart.items.length) {
      return res.status(200).json({
        success: true,
        data: {
          recommendations: []
        }
      });
    }

    // Extract categories and price ranges from cart items
    const cartCategories = cart.items.map(item => item.product.category.toString());
    const cartPrices = cart.items.map(item => item.product.price);
    const avgPrice = cartPrices.reduce((a, b) => a + b, 0) / cartPrices.length;
    
    // Price range: ±30% of average cart item price
    const minPrice = avgPrice * 0.7;
    const maxPrice = avgPrice * 1.3;

    // Find similar products
    const recommendations = await Product.find({
      $and: [
        { _id: { $nin: cart.items.map(item => item.product._id) } }, // Exclude items already in cart
        { isActive: true },
        { stock: { $gt: 0 } },
        {
          $or: [
            { category: { $in: cartCategories } }, // Same categories as cart items
            { price: { $gte: minPrice, $lte: maxPrice } } // Similar price range
          ]
        }
      ]
    })
    .populate('category')
    .limit(6) // Limit to 6 recommendations
    .select('-ratings');

    res.json({
      success: true,
      data: {
        recommendations
      }
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Checkout products
exports.checkout = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(createError(400, 'Items are required'));
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.country) {
      return next(createError(400, 'Complete shipping address is required'));
    }

    if (!paymentMethod || !['card', 'paypal', 'cash_on_delivery'].includes(paymentMethod)) {
      return next(createError(400, 'Valid payment method is required'));
    }

    // Validate and process items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return next(createError(400, 'Each item must have a valid productId and quantity'));
      }

      // Check if product exists and has sufficient stock
      const product = await Product.findById(item.productId);
      if (!product) {
        return next(createError(404, `Product with ID ${item.productId} not found`));
      }

      if (!product.isActive) {
        return next(createError(400, `Product ${product.name} is not available`));
      }

      if (product.stock < item.quantity) {
        return next(createError(400, `Insufficient stock for ${product.name}. Available: ${product.stock}`));
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Create order
    const order = new Order({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending',
      orderStatus: 'pending'
    });

    await order.save();

    // Populate order details for response
    await order.populate('items.product', 'name price image');
    await order.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount
      }
    });

  } catch (error) {
    console.error('Checkout error:', error);
    next(createError(500, 'Failed to process checkout'));
  }
};

// Checkout from cart
exports.checkoutFromCart = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.country) {
      return next(createError(400, 'Complete shipping address is required'));
    }

    if (!paymentMethod || !['card', 'paypal', 'cash_on_delivery'].includes(paymentMethod)) {
      return next(createError(400, 'Valid payment method is required'));
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return next(createError(400, 'Cart is empty'));
    }

    // Validate cart items and calculate total
    const orderItems = [];
    let totalAmount = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      
      if (!product.isActive) {
        return next(createError(400, `Product ${product.name} is not available`));
      }

      if (product.stock < cartItem.quantity) {
        return next(createError(400, `Insufficient stock for ${product.name}. Available: ${product.stock}`));
      }

      const itemTotal = product.price * cartItem.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: cartItem.quantity,
        price: product.price
      });

      // Update product stock
      product.stock -= cartItem.quantity;
      await product.save();
    }

    // Create order
    const order = new Order({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending',
      orderStatus: 'pending'
    });

    await order.save();

    // Clear the cart after successful order
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    // Populate order details for response
    await order.populate('items.product', 'name price image');
    await order.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Order created successfully from cart',
      data: {
        order,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount
      }
    });

  } catch (error) {
    console.error('Cart checkout error:', error);
    next(createError(500, 'Failed to process cart checkout'));
  }
};

// Get user orders
exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: userId })
      .populate('items.product', 'name price image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ user: userId });

    setCacheHeader(res, CACHE_DURATIONS.SHORT);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: page < Math.ceil(totalOrders / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    next(createError(500, 'Failed to fetch orders'));
  }
};

// Get single order
exports.getOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(createError(400, 'Invalid order ID'));
    }

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('items.product', 'name price image')
      .populate('user', 'name email');

    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    setCacheHeader(res, CACHE_DURATIONS.SHORT);

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Get order error:', error);
    next(createError(500, 'Failed to fetch order'));
  }
};
