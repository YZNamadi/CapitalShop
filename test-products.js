const axios = require('axios');

const API_URL = 'http://localhost:9898';

// Test getting all products
async function testGetProducts() {
  try {
    console.log('Testing GET /api/products...');
    const response = await axios.get(`${API_URL}/api/products`);
    console.log('Success! Found', response.data.data.products.length, 'products');
    return response.data;
  } catch (error) {
    console.error('Error getting products:', error.response?.data || error.message);
  }
}

// Test getting products by category
async function testGetProductsByCategory(category) {
  try {
    console.log(`Testing GET /api/products/category/${category}...`);
    const response = await axios.get(`${API_URL}/api/products/category/${category}`);
    console.log('Success! Found', response.data.data.products.length, `products in ${category} category`);
    return response.data;
  } catch (error) {
    console.error('Error getting products by category:', error.response?.data || error.message);
  }
}

// Test getting product by ID
async function testGetProductById(id) {
  try {
    console.log(`Testing GET /api/products/${id}...`);
    const response = await axios.get(`${API_URL}/api/products/${id}`);
    console.log('Success! Found product:', response.data.data.name);
    return response.data;
  } catch (error) {
    console.error('Error getting product by ID:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('Starting product endpoint tests...\n');
  
  // Test 1: Get all products
  const allProducts = await testGetProducts();
  console.log('\n');
  
  if (allProducts?.data?.products?.length > 0) {
    // Test 2: Get product by ID (using first product from previous test)
    const firstProduct = allProducts.data.products[0];
    await testGetProductById(firstProduct._id);
    console.log('\n');
    
    // Test 3: Get products by category (using first product's category)
    await testGetProductsByCategory(firstProduct.category);
  }
}

runTests(); 