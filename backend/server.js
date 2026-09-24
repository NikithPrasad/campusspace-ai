require('dotenv').config({ quiet: true });
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set. Add it to backend/.env');
    process.exit(1);
  }
  try {
    await connectDB();
  } catch (err) {
    // Never print the URI itself — it contains the DB password
    console.error('MongoDB connection failed:', err.message.replace(/mongodb(\+srv)?:\/\/\S+/g, '<hidden-uri>'));
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
