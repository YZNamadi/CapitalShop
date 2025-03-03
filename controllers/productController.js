const cloudinary = require('../cloudinaryConfig');
const Product = require('../models/product');
const fs = require('fs');

// Create product
exports.createProduct = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'image',
      folder: 'capital_shop/products',
    });

    // Remove temp file
    fs.unlinkSync(req.file.path);

    // Create product
    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      image: result.secure_url,
    });

    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

// Get all products with pagination
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find().skip(skip).limit(limit);
    const totalProducts = await Product.countDocuments();

    res.json({
      products,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Filter products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    let imageUrl;

    if (req.file) {
      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'image',
        folder: 'capital_shop/products',
      });

      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path); // Remove temp file
    }

    // Find product by ID
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Update product fields
    product.name = req.body.name || product.name;
    product.price = req.body.price || product.price;
    product.description = req.body.description || product.description;
    product.category = req.body.category || product.category;
    product.image = imageUrl || product.image;

    await product.save();
    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};
