#!/usr/bin/env node

/**
 * SAFE DATABASE RESET SCRIPT
 * 
 * This script completely wipes all collections from the RideConnect database.
 * It requires manual confirmation before execution.
 * 
 * USAGE: node scripts/resetDatabase.js
 * 
 * ⚠️ WARNING: This will delete ALL data. This cannot be undone.
 */

const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI not found in environment variables.');
  console.error('Please ensure .env file exists with MONGODB_URI set.');
  process.exit(1);
}

// Models to reset
const models = [
  { name: 'User', model: require('../src/models/User') },
  { name: 'Ride', model: require('../src/models/Ride') },
  { name: 'Car', model: require('../src/models/Car') },
  { name: 'Driver', model: require('../src/models/Driver') },
  { name: 'Booking', model: require('../src/models/Booking') },
  { name: 'Request', model: require('../src/models/Request') },
  { name: 'Message', model: require('../src/models/Message') },
  { name: 'Notification', model: require('../src/models/Notification') }
];

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logWarning(message) {
  log(message, colors.yellow);
}

function logError(message) {
  log(message, colors.red);
}

function logSuccess(message) {
  log(message, colors.green);
}

function logInfo(message) {
  log(message, colors.cyan);
}

async function getDocumentCounts() {
  const counts = {};
  for (const { name, model } of models) {
    try {
      counts[name] = await model.countDocuments();
    } catch (error) {
      counts[name] = 'ERROR';
      logError(`  Error counting ${name}: ${error.message}`);
    }
  }
  return counts;
}

async function deleteCollection(name, model) {
  try {
    const result = await model.deleteMany({});
    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function verifyEmptyCollections() {
  const results = {};
  for (const { name, model } of models) {
    try {
      const count = await model.countDocuments();
      results[name] = count === 0;
      if (count !== 0) {
        logError(`  ❌ ${name} still has ${count} documents`);
      }
    } catch (error) {
      results[name] = false;
      logError(`  ❌ Error verifying ${name}: ${error.message}`);
    }
  }
  return results;
}

async function main() {
  console.log('\n' + '='.repeat(70));
  logWarning('⚠️  RIDECONNECT DATABASE RESET SCRIPT', colors.yellow);
  console.log('='.repeat(70) + '\n');

  try {
    // Connect to MongoDB
    logInfo('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logSuccess('✅ Connected to MongoDB\n');

    // Get current document counts
    logInfo('📊 Current document counts:');
    const counts = await getDocumentCounts();
    for (const [name, count] of Object.entries(counts)) {
      if (count === 'ERROR') {
        logError(`  ❌ ${name}: ERROR`);
      } else if (count === 0) {
        logInfo(`  ✓ ${name}: 0`);
      } else {
        logWarning(`  ⚠️  ${name}: ${count}`);
      }
    }
    console.log('');

    // Calculate total documents
    const totalDocs = Object.values(counts).reduce((sum, count) => {
      return typeof count === 'number' ? sum + count : sum;
    }, 0);

    if (totalDocs === 0) {
      logSuccess('✅ Database is already empty. No action needed.\n');
      await mongoose.disconnect();
      return;
    }

    // Warning message
    logWarning('⚠️  WARNING: This will permanently delete ALL data!');
    logWarning(`⚠️  Total documents to delete: ${totalDocs}`);
    logWarning('⚠️  This action CANNOT be undone!\n');

    // Require confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmation = await new Promise((resolve) => {
      rl.question('Type "DELETE_ALL_DATA" to confirm: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (confirmation !== 'DELETE_ALL_DATA') {
      logError('\n❌ Confirmation failed. Aborting database reset.\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    logSuccess('\n✅ Confirmation received. Proceeding with database reset...\n');

    // Delete collections
    logInfo('🗑️  Deleting collections:');
    let totalDeleted = 0;
    let errors = [];

    for (const { name, model } of models) {
      const result = await deleteCollection(name, model);
      if (result.success) {
        logSuccess(`  ✓ ${name}: ${result.deletedCount} documents deleted`);
        totalDeleted += result.deletedCount;
      } else {
        logError(`  ❌ ${name}: ${result.error}`);
        errors.push({ name, error: result.error });
      }
    }

    console.log('');

    if (errors.length > 0) {
      logError(`⚠️  ${errors.length} collection(s) failed to delete`);
      for (const { name, error } of errors) {
        logError(`  - ${name}: ${error}`);
      }
    } else {
      logSuccess(`✅ Successfully deleted ${totalDeleted} documents from ${models.length} collections\n`);
    }

    // Verify all collections are empty
    logInfo('🔍 Verifying all collections are empty:');
    const verificationResults = await verifyEmptyCollections();
    const allEmpty = Object.values(verificationResults).every(result => result === true);

    console.log('');

    if (allEmpty) {
      logSuccess('✅ All collections verified: EMPTY');
    } else {
      logError('❌ Some collections still contain data. Please check the logs above.');
    }

    // Disconnect
    await mongoose.disconnect();
    logSuccess('\n✅ Database reset completed successfully.\n');

    // Post-reset reminder
    console.log('='.repeat(70));
    logInfo('📋 POST-RESET STEPS:', colors.cyan);
    console.log('='.repeat(70));
    console.log('After the database reset, you must:');
    console.log('');
    console.log('1. Register a new account via the frontend');
    console.log('2. Create new rides, cars, or driver listings');
    console.log('3. Test all features (booking, requests, chat, notifications)');
    console.log('4. Verify the system works as expected');
    console.log('');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    logError(`\n❌ Fatal error: ${error.message}`);
    logError(error.stack);
    
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    process.exit(1);
  }
}

// Run the script
main();
