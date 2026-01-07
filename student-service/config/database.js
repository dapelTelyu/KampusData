// student-service/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // HAPUS opsi { useNewUrlParser: true, useUnifiedTopology: true }
    // Cukup pass URI-nya saja.
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_db');
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;