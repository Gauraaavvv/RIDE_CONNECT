const mongoose = require('mongoose');

const dropLegacyRideIndexes = async (connection) => {
  try {
    const db = connection.db;
    const collections = await db.listCollections({ name: 'rides' }).toArray();
    if (!collections.length) {
      return;
    }

    const ridesCollection = db.collection('rides');
    const indexes = await ridesCollection.indexes();
    const legacyIndexes = new Set(['source_2dsphere', 'destination_2dsphere']);

    for (const index of indexes) {
      if (legacyIndexes.has(index.name)) {
        await ridesCollection.dropIndex(index.name);
        console.log(`🧹 Dropped legacy index: rides.${index.name}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not cleanup legacy ride indexes: ${error.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/assam-ride-connect', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await dropLegacyRideIndexes(conn.connection);

    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB; 
