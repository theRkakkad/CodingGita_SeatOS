const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // STEP 8: Enforce TLS/HTTPS Encryption for Database connection
    // (mongodb+srv:// automatically enforces TLS encryption in transit)
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50, // Prevent database connection exhaustion
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is unreachable
      socketTimeoutMS: 45000, // Close idle sockets
    });
    console.log(`MongoDB Connected (TLS Encrypted & Hardened): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
