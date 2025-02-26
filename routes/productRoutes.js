
const express = require('express');
const router = express.Router();
const upload= require('../multerConfig')
const productController = require('../controllers/productController');


router.get('/', productController.getProducts);


router.get('/:id', productController.getProductById);

router.get('/category/:category', productController.getProductsByCategory);

// Create a new product
router.post('/products', upload.single('image'), productController.createProduct);

// Update an existing product
router.put('/products/:id', upload.single('image'), productController.updateProduct);

module.exports = router;