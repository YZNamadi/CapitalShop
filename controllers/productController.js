const cloudinary = require('../cloudinaryConfig');
const Product = require('../models/product');
const fs = require('fs');
const createError = require('../utils/error');
const mongoose = require('mongoose');

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

    // Validate category
    const category = req.body.category.toLowerCase();
    const validCategories = [
      'senator', 'summer-men', 'formal-wear', 'casuals',
      'mesh-gowns', 'bubu-gowns', 'dinner-gowns',
      'ball-gowns', 'summer-baby', 'diapers'
    ];
    if (!validCategories.includes(category)) {
      console.log('Invalid category:', category);
      return next(createError(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`));
    }

    try {
      console.log('Uploading image to Cloudinary...');
      const imageUrl = await uploadToCloudinary(req.file);
      console.log('Image uploaded successfully:', imageUrl);

      // Create product
      const product = new Product({
        name: req.body.name.trim(),
        price: price,
        description: req.body.description.trim(),
        category: category,
        image: imageUrl,
        stock: parseInt(req.body.stock) || 0,
        isActive: true
      });

      console.log('Saving product to database...');
      const savedProduct = await product.save();
      console.log('Product saved successfully:', savedProduct);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: savedProduct
      });
    } catch (uploadError) {
      console.error('Error during image upload or product save:', uploadError);
      return next(createError(500, 'Failed to upload image or save product. Please try again.'));
    }
  } catch (error) {
    console.error('Product creation error:', error);
    if (error.name === 'ValidationError') {
      return next(createError(400, error.message));
    }
    next(createError(error.statusCode || 500, error.message || 'Internal server error during product creation'));
  }
};

// Get all products with pagination, sorting, and filtering
exports.getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Build query
    const query = {};  // Remove isActive filter to show all products
    
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

    console.log('Query:', query); // Add logging for debugging

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-ratings'), // Exclude ratings array for performance
      Product.countDocuments(query)
    ]);

    console.log('Found products:', products.length); // Add logging for debugging

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
    console.error('Get products error:', error); // Add error logging
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
    // Clean the category by removing quotes and decoding URL
    const category = decodeURIComponent(req.params.category).replace(/['"]+/g, '').toLowerCase();
    
    // Validate category
    const validCategories = [
      // Men's categories
      'senator', 'summer-men', 'formal-wear', 'casuals',
      // Women's categories
      'mesh-gowns', 'bubu-gowns', 'dinner-gowns',
      // Baby collection
      'ball-gowns', 'summer-baby', 'diapers'
    ];
    
    if (!validCategories.includes(category)) {
      console.log('Invalid category requested:', category);
      console.log('Valid categories are:', validCategories);
      return next(createError(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`));
    }

    const products = await Product.find({
      category: category,
      isActive: true
    })
    .select('-ratings')
    .sort({ createdAt: -1 });

    console.log(`Found ${products.length} products in category: ${category}`);

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
    console.error('Error getting products by category:', error);
    next(createError(500, 'Error retrieving products'));
  }
};
