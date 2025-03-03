
const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
  name: {
     type: String,
      required: true
     },
  email: { 
    type: String,
     required: true, 
     unique: true 
    },
  password: {
     type: String,
      required: true
     },
  isVerified:{
      type: Boolean,
      default:false
  },

  isAdmin: {
      type: Boolean,
      default: false
  },

  isSuperAdmin: {
      type: Boolean,
      default: false
  },

  dateCreated: {
      type: Date,
      default: () => {
          const date = new Date
          return date.toISOString()
      }
  },
  verificationToken: {
    type: String,
    required: false
  },
  

  role: {
    type: String, 
    enum: ['user', 'admin'],
     default: 'user' },
});


module.exports = mongoose.model('User', userSchema);
