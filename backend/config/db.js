const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is not set. Add it to backend/.env');
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected successfully');
}

module.exports = connectDB;
