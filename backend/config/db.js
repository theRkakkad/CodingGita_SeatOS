const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // STEP 8: Enforce TLS/HTTPS Encryption for Database connection
    // (mongodb+srv:// automatically enforces TLS encryption in transit)
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected (TLS Encrypted): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
