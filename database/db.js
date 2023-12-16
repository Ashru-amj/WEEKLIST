const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables first

const MONGO_URL = process.env.MONGO_URL;

exports.connect = async () => {
  try {
    await mongoose.connect(MONGO_URL)
    console.log('MongoDB connected');
    
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
  }
};
