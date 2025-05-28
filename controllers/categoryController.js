const Category = require('../models/category');
const createError = require('../utils/error');

// Create a new category
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, parent } = req.body;

    const category = new Category({
      name,
      description,
      parent: parent || null
    });

    const savedCategory = await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: savedCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createError(400, 'Category with this name already exists'));
    }
    next(createError(error.statusCode || 500, error.message));
  }
};

// Get all categories with their subcategories
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ parent: null, isActive: true })
      .populate({
        path: 'subcategories',
        match: { isActive: true },
        populate: {
          path: 'subcategories',
          match: { isActive: true }
        }
      });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Get category by ID
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate({
        path: 'subcategories',
        match: { isActive: true }
      });

    if (!category) {
      return next(createError(404, 'Category not found'));
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Update category
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, parent, isActive } = req.body;
    
    // Prevent category from being its own parent
    if (parent === req.params.id) {
      return next(createError(400, 'Category cannot be its own parent'));
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(createError(404, 'Category not found'));
    }

    // Check if new parent would create a circular reference
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return next(createError(404, 'Parent category not found'));
      }
      
      let currentParent = parentCategory.parent;
      while (currentParent) {
        if (currentParent.toString() === req.params.id) {
          return next(createError(400, 'Cannot create circular reference in category hierarchy'));
        }
        const parent = await Category.findById(currentParent);
        currentParent = parent ? parent.parent : null;
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        parent: parent || null,
        isActive
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createError(400, 'Category with this name already exists'));
    }
    next(createError(error.statusCode || 500, error.message));
  }
};

// Delete category (soft delete)
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(createError(404, 'Category not found'));
    }

    // Soft delete by setting isActive to false
    category.isActive = false;
    await category.save();

    // Also soft delete all subcategories
    await Category.updateMany(
      { parent: req.params.id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Category and its subcategories deleted successfully'
    });
  } catch (error) {
    next(createError(500, error.message));
  }
};

// Get subcategories of a category
exports.getSubcategories = async (req, res, next) => {
  try {
    const subcategories = await Category.find({
      parent: req.params.id,
      isActive: true
    });

    res.json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    next(createError(500, error.message));
  }
}; 