
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());

app.use(bodyParser.json());

app.use('/api/orders', require('./routes/orderRoutes')); 
mongoose
.connect(process.env.MONGO_URI)
.then(() =>{ console.log('MongoDB connected')

    app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
})
.catch((err) => {console.error('MongoDB connection error:', err)
})
// routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));


const PORT = process.env.PORT || 9898;