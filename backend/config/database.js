const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Automatically normalize legacy and unformatted customer/restaurant data
    const { runDataMigration } = require('../utils/migrationService');
    runDataMigration().catch((err) => console.error('[DB] Migration error:', err.message));
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;