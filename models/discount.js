const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },  
  discountType: { type: String, enum: ['fixed', 'percentage'], required: true },
  amount: { type: Number, required: true },  
  expiresAt: { type: Date, required: true }, 
  isActive: { type: Boolean, default: true } 
});

module.exports = mongoose.model('Discount', discountSchema);
