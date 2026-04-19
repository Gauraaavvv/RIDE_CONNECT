const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');
const Ride = require('./src/models/Ride');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/assam-ride-connect');
  const user1 = await User.create({ name: 'U1', email: 'u1@x.com', phone: '9876543210', password: 'password123' });
  const user2 = await User.create({ name: 'U2', email: 'u2@x.com', phone: '9876543211', password: 'password123' });
  const ride = await Ride.create({ driver: user1._id, source: 'A', destination: 'B', date: new Date(), time: '10:00', availableSeats: 4, pricePerSeat: 100, vehicleNumber: '123' });
  const booking = await Booking.create({ ride: ride._id, passenger: user2._id, driver: user1._id, seats: 1, amount: 100, pickupLocation: { name: 'A' }, dropLocation: { name: 'B' }, payment: { amount: 100 } });
  
  console.log("Accepting...");
  try {
    const b = await Booking.findById(booking._id).populate('ride');
    b.status = 'confirmed';
    await b.save();
    await b.ride.addPassenger(b.passenger, b.seats, 'A', 'B');
    await b.ride.acceptPassenger(b.passenger);
    await b.addNotification('booking_accepted', 'msg', b.passenger);
    await b.populate(['ride', 'driver', 'passenger']);
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
run();
