const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:9898';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/users/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });
    return response.data.token;
  } catch (error) {
    console.log('Login failed, trying to register...');
    // If login fails, try to register
    await axios.post(`${API_URL}/api/users/register`, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpassword123'
    });
    // Try login again
    const response = await axios.post(`${API_URL}/api/users/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });
    return response.data.token;
  }
}

async function testEndpoints() {
  try {
    console.log('Testing product endpoints...\n');

    // Login first
    console.log('Logging in...');
    const token = await login();
    console.log('Successfully logged in');

    // 1. Create a test product
    console.log('\n1. Creating a test product...');
    const formData = new FormData();
    formData.append('name', 'Test Senator Wear');
    formData.append('price', '99.99');
    formData.append('description', 'A beautiful senator wear for special occasions');
    formData.append('category', 'senator');
    formData.append('stock', '10');
    
    // Create a test image if it doesn't exist
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    if (!fs.existsSync(testImagePath)) {
      // Create a small black square as test image
      const buffer = Buffer.from('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', 'base64');
      fs.writeFileSync(testImagePath, buffer);
    }
    formData.append('image', fs.createReadStream(testImagePath));

    const createResponse = await axios.post(`${API_URL}/api/products`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Product created:', createResponse.data);
    const productId = createResponse.data.data._id;

    // 2. Get all products
    console.log('\n2. Getting all products...');
    const allProducts = await axios.get(`${API_URL}/api/products`);
    console.log('All products count:', allProducts.data.data.products.length);

    // 3. Get product by category
    console.log('\n3. Getting products by category (senator)...');
    const categoryProducts = await axios.get(`${API_URL}/api/products/category/senator`);
    console.log('Senator category products count:', categoryProducts.data.data.products.length);

    // 4. Get product by ID
    console.log('\n4. Getting product by ID...');
    const product = await axios.get(`${API_URL}/api/products/${productId}`);
    console.log('Retrieved product name:', product.data.data.name);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Error details:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

testEndpoints(); 