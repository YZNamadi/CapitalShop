const cloudinary = require('../cloudinaryConfig');
const Product = require('../models/product');
const fs = require('fs');
const createError = require('../utils/error');

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
    if (!req.file) {
      return next(createError(400, 'Product image is required'));
    }

    // Validate required fields
    const requiredFields = ['name', 'price', 'description', 'category'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return next(createError(400, `${field} is required`));
      }
    }

    // Upload image
    const imageUrl = await uploadToCloudinary(req.file);

    // Create product
    const product = new Product({
      name: req.body.name,
      price: parseFloat(req.body.price),
      description: req.body.description,
      category: req.body.category.toLowerCase(),
      image: imageUrl,
      stock: parseInt(req.body.stock) || 0,
    });

    await product.save();
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(createError(error.statusCode || 500, error.message));
  }
};

// Get all products with pagination, sorting, and filtering
exports.getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Build query
    const query = { isActive: true };
    
    // Price filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Category filter
    if (req.query.category) {
      query.category = req.query.category.toLowerCase();
    }

    // Stock filter
    if (req.query.inStock === 'true') {
      query.stock = { $gt: 0 };
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

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-ratings'), // Exclude ratings array for performance
      Product.countDocuments(query)
    ]);

    // Set cache header for product listings
    setCacheHeader(res, CACHE_DURATIONS.SHORT);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          totalProducts,
          totalPages: Math.ceil(totalProducts / limit),
          currentPage: page,
          limit
        }
      }
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Get product by ID
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'ratings.user',
        select: 'name'
      });
    
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    // Set cache header for individual products
    setCacheHeader(res, CACHE_DURATIONS.MEDIUM);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(createError(500, error.message));
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
    const { category } = req.params;
    
    // Validate category
    const validCategories = [
      // Men's categories
      'senator', 'summer-men', 'formal-wear', 'casuals',
      // Women's categories
      'mesh-gowns', 'bubu-gowns', 'dinner-gowns',
      // Baby collection
      'ball-gowns', 'summer-baby', 'diapers'
    ];
    
    if (!validCategories.includes(category.toLowerCase())) {
      return next(createError(400, 'Invalid category'));
    }

    const products = await Product.find({
      category: category.toLowerCase(),
      isActive: true
    })
    .select('-ratings')
    .sort({ createdAt: -1 });

    // Set cache header for category listings
    setCacheHeader(res, CACHE_DURATIONS.MEDIUM);

    res.json({
      success: true,
      data: {
        category,
        products,
        count: products.length
      }
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};
