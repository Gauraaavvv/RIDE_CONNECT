const axios = require('axios');
const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');
const Ride = require('./src/models/Ride');
const User = require('./src/models/User');
const jwt = require('jsonwebtoken');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/assam-ride-connect');
  const user1 = await User.findOne({ email: 'u1@x.com' });
  const user2 = await User.findOne({ email: 'u2@x.com' });
  const ride = await Ride.findOne({ driver: user1._id });
  
  // Create a new booking
  const booking = await Booking.create({ ride: ride._id, passenger: user2._id, driver: user1._id, seats: 1, amount: 100, pickupLocation: { name: 'A' }, dropLocation: { name: 'B' }, payment: { amount: 100 } });
  
  // generate token for driver (user1)
  const token = jwt.sign({ user: { id: user1._id } }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1h' });
  
  // We need the server to be running. I will start the server then run this script.
}
run();
