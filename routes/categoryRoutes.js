const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validate');
const { body } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management with hierarchical structure
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated category ID
 *           example: "60d3b41ef682744d9740e065"
 *         name:
 *           type: string
 *           description: Category name
 *           example: "Men"
 *         slug:
 *           type: string
 *           description: URL-friendly category name
 *           example: "men"
 *         description:
 *           type: string
 *           description: Category description
 *           example: "Men's clothing and accessories"
 *         parent:
 *           type: string
 *           nullable: true
 *           description: Parent category ID (null for main categories)
 *           example: null
 *         isActive:
 *           type: boolean
 *           description: Category status
 *           example: true
 *         subcategories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Category'
 *           description: List of subcategories (populated on request)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-15T10:30:00Z"
 */

// Validation middleware
const categoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID')
];

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories with their subcategories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of all categories with their hierarchical structure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       500:
 *         description: Server error
 */
router.get('/', categoryController.getAllCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID with its immediate subcategories
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details with subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.get('/:id', validate([schemas.id]), categoryController.getCategoryById);

/**
 * @swagger
 * /api/categories/{id}/subcategories:
 *   get:
 *     summary: Get immediate subcategories of a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent category ID
 *     responses:
 *       200:
 *         description: List of subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.get('/:id/subcategories', validate([schemas.id]), categoryController.getSubcategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *                 example: "Senator"
 *               description:
 *                 type: string
 *                 description: Category description
 *                 example: "Senator style clothing for men"
 *               parent:
 *                 type: string
 *                 description: Parent category ID (omit for main categories)
 *                 example: "60d3b41ef682744d9740e065"
 *           examples:
 *             mainCategory:
 *               summary: Create a main category
 *               value:
 *                 name: "Men"
 *                 description: "Men's clothing and accessories"
 *             subCategory:
 *               summary: Create a subcategory
 *               value:
 *                 name: "Senator"
 *                 description: "Senator style clothing for men"
 *                 parent: "60d3b41ef682744d9740e065"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Category created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, validate(categoryValidation), categoryController.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New category name
 *               description:
 *                 type: string
 *                 description: New category description
 *               parent:
 *                 type: string
 *                 description: New parent category ID
 *               isActive:
 *                 type: boolean
 *                 description: Category status
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid request data or circular reference detected
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.put('/:id', 
  authMiddleware, 
  validate([...categoryValidation, schemas.id]), 
  categoryController.updateCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Soft delete a category and its subcategories
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category and its subcategories deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.delete('/:id', authMiddleware, validate([schemas.id]), categoryController.deleteCategory);

module.exports = router; 