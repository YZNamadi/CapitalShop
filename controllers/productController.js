const cloudinary= require('../cloudinaryConfig')
const Product = require('../models/product');

exports.createProduct = async (req, res, next) => {
  try {
    let imageUrl;

    // Check if an image was uploaded
    if (req.file) {
      // Upload the image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.buffer.toString('base64'), {
        resource_type: 'auto',
        folder: 'capital_shop/products',
      });

      // Extract the secure URL of the uploaded image
      imageUrl = result.secure_url;
    } else {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Create the product in the database
    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      image: imageUrl,
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
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: error.message })
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

// controllers/ProductController.js

exports.updateProduct = async (req, res, next) => {
  try {
    let imageUrl;

    // Check if a new image was uploaded
    if (req.file) {
      // Upload the new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.buffer.toString('base64'), {
        resource_type: 'auto',
        folder: 'capital_shop/products',
      });

      // Extract the secure URL of the uploaded image
      imageUrl = result.secure_url;
    }

    // Find the product by ID
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update the product fields
    product.name = req.body.name || product.name;
    product.price = req.body.price || product.price;
    product.description = req.body.description || product.description;
    product.image = imageUrl || product.image; 

    // Save the updated product
    await product.save();

    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};
