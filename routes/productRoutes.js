const express = require('express');
const router = express.Router();
const upload = require('../multerConfig');
const productController = require('../controllers/productController');

router.get('/', productController.getProducts);


router.get('/category/:category', productController.getProductsByCategory);

router.get('/:id', productController.getProductById);

// Create a new product
router.post('/', upload.single('image'), productController.createProduct);

// Update an existing product
router.put('/:id', upload.single('image'), productController.updateProduct);

module.exports = router;
