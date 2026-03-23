const express = require('express');
const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const auth = require('../middleware/auth');
const router = express.Router();

const normalizeRideInput = (payload = {}) => {
  const source = payload.source?.name || payload.source;
  const destination = payload.destination?.name || payload.destination;
  const availableSeats = Number(payload.availableSeats ?? payload.seats ?? 1);
  const pricePerSeat = Number(payload.pricePerSeat ?? payload.price ?? payload.pricing?.baseFare ?? 0);
  const vehicleType = payload.vehicleType || payload.vehicle?.type || 'car';
  const vehicleNumber = payload.vehicleNumber || payload.vehicle?.number;

  return {
    source,
    destination,
    date: payload.date,
    time: payload.time,
    availableSeats,
    pricePerSeat,
    vehicleType,
    vehicleNumber,
    description: payload.description || '',
    preferences: payload.preferences || {},
    route: payload.route || {},
    contactNumber: payload.contactNumber || '',
    pickupLocation: payload.pickupLocation || '',
    dropLocation: payload.dropLocation || '',
    serviceType: payload.serviceType || 'offer_ride',
    pricing: payload.pricing || {}
  };
};

const formatDistanceDuration = (route = {}) => {
  const km = route.distance;
  const mins = route.duration;
  let distance = '';
  let duration = '';
  if (typeof km === 'number' && km > 0) {
    distance = `${Math.round(km)} km`;
  }
  if (typeof mins === 'number' && mins > 0) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return { distance, duration };
};

const serializeRide = (ride) => {
  const driverDoc =
    ride.driver && typeof ride.driver === 'object' && ride.driver._id
      ? ride.driver
      : null;
  const driverName = driverDoc?.name || 'Driver';
  const remaining =
    typeof ride.remainingSeats === 'number'
      ? ride.remainingSeats
      : Math.max(0, (ride.availableSeats || 0) - (ride.seatsBooked || 0));
  const { distance, duration } = formatDistanceDuration(ride.route || {});

  return {
    id: ride._id.toString(),
    driver: ride.driver,
    driverName,
    driverId: driverDoc?._id
      ? driverDoc._id.toString()
      : (ride.driver ? String(ride.driver) : ''),
    rating: driverDoc?.rating ?? 0,
    isVerified: Boolean(driverDoc?.isVerified),
    isPremium: Boolean(driverDoc?.isPremium),
    serviceType: ride.serviceType,
    source: ride.source,
    destination: ride.destination,
    date: ride.date,
    time: ride.time,
    availableSeats: ride.availableSeats,
    seatsBooked: ride.seatsBooked,
    remainingSeats: remaining,
    pricePerSeat: ride.pricePerSeat,
    pricing: ride.pricing,
    vehicleType: ride.vehicleType,
    vehicleNumber: ride.vehicleNumber,
    description: ride.description,
    preferences: ride.preferences,
    route: ride.route,
    passengers: ride.passengers,
    status: ride.status,
    contactNumber: ride.contactNumber,
    pickupLocation: ride.pickupLocation,
    dropLocation: ride.dropLocation,
    distance,
    duration,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt
  };
};

// Get all rides
router.get('/', async (req, res) => {
  try {
    const { source, destination, date, status, serviceType, driverId, minSeats, maxPrice, availableOnly = 'true' } = req.query;
    
    let query = {};

    if (status) {
      query.status = status;
    }

    if (serviceType) {
      query.serviceType = serviceType;
    }

    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
      query.driver = driverId;
    }

    if (availableOnly !== 'false') {
      query.status = query.status || 'active';
      query.$expr = { $gt: [{ $subtract: ['$availableSeats', '$seatsBooked'] }, 0] };
    }

    if (minSeats) {
      query.$expr = query.$expr || { $gt: [{ $subtract: ['$availableSeats', '$seatsBooked'] }, 0] };
      query.$and = query.$and || [];
      query.$and.push({
        $expr: { $gte: [{ $subtract: ['$availableSeats', '$seatsBooked'] }, Number(minSeats)] }
      });
    }

    if (maxPrice) {
      query.pricePerSeat = { $lte: Number(maxPrice) };
    }

    if (source) {
      query.source = new RegExp(String(source), 'i');
    }
    
    if (destination) {
      query.destination = new RegExp(String(destination), 'i');
    }
    
    if (date) {
      const searchDate = new Date(String(date));
      if (Number.isNaN(searchDate.getTime())) {
        return res.status(400).json({
          status: 'error',
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const startDate = new Date(searchDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(searchDate);
      endDate.setHours(23, 59, 59, 999);

      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const rides = await Ride.find(query)
      .populate('driver', 'name rating isVerified isPremium phone vehicle')
      .populate('passengers.user', 'name rating isVerified')
      .sort({ date: 1, time: 1, createdAt: -1 });

    const serializedRides = rides.map(serializeRide);

    res.json({
      status: 'success',
      rides: serializedRides,
      total: serializedRides.length,
      data: {
        rides: serializedRides,
        total: serializedRides.length
      }
    });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: 'Server error while fetching rides' });
  }
});

// Get logged-in user's rides
router.get('/mine', auth, async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.user.id })
      .populate('driver', 'name rating isVerified isPremium phone')
      .populate('passengers.user', 'name rating isVerified')
      .sort({ createdAt: -1 });

    const serializedRides = rides.map(serializeRide);

    res.json({
      status: 'success',
      rides: serializedRides,
      data: {
        rides: serializedRides
      }
    });
  } catch (error) {
    console.error('Error fetching user rides:', error);
    res.status(500).json({ error: 'Server error while fetching user rides' });
  }
});

// Get single ride
router.get('/:id', async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name rating isVerified phone vehicle isPremium')
      .populate('passengers.user', 'name rating isVerified');

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const serialized = serializeRide(ride);

    res.json({
      status: 'success',
      ride: serialized,
      data: {
        ride: serialized
      }
    });
  } catch (error) {
    console.error('Error fetching ride:', error);
    res.status(500).json({ error: 'Server error while fetching ride' });
  }
});

const createRideListing = async (req, res, serviceTypeOverride) => {
  try {
    const normalizedInput = normalizeRideInput({
      ...req.body,
      serviceType: serviceTypeOverride || req.body.serviceType
    });

    if (!normalizedInput.source || !normalizedInput.destination || !normalizedInput.date || !normalizedInput.time) {
      return res.status(400).json({
        status: 'error',
        error: 'source, destination, date, and time are required'
      });
    }

    if (!normalizedInput.vehicleNumber) {
      return res.status(400).json({
        status: 'error',
        error: 'vehicleNumber is required'
      });
    }

    if (Number.isNaN(normalizedInput.availableSeats) || normalizedInput.availableSeats <= 0) {
      return res.status(400).json({
        status: 'error',
        error: 'availableSeats must be greater than 0'
      });
    }

    if (Number.isNaN(normalizedInput.pricePerSeat) || normalizedInput.pricePerSeat < 0) {
      return res.status(400).json({
        status: 'error',
        error: 'pricePerSeat must be a valid non-negative number'
      });
    }

    const parsedDate = new Date(normalizedInput.date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid date format'
      });
    }

    const ride = new Ride({
      ...normalizedInput,
      driver: req.user.id,
      date: parsedDate,
      serviceType: normalizedInput.serviceType || 'offer_ride'
    });

    await ride.save();

    // Mark user as driver and persist vehicle details if not already available.
    if (!req.user.isDriver || !req.user.vehicle?.number) {
      req.user.isDriver = true;
      req.user.vehicle = {
        ...(req.user.vehicle || {}),
        type: normalizedInput.vehicleType,
        number: normalizedInput.vehicleNumber
      };
      await req.user.save();
    }

    const populatedRide = await Ride.findById(ride._id).populate('driver', 'name rating isVerified isPremium phone vehicle');

    const serialized = serializeRide(populatedRide);

    res.status(201).json({
      status: 'success',
      message: `${ride.serviceType.replace('_', ' ')} created successfully`,
      ride: serialized,
      data: {
        ride: serialized
      }
    });
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({ error: 'Server error while creating ride', details: error.message });
  }
};

// Create new ride
router.post('/', auth, async (req, res) => {
  await createRideListing(req, res);
});

// Create rent-car service listing
router.post('/rent', auth, async (req, res) => {
  await createRideListing(req, res, 'rent_car');
});

// Create hire-driver service listing
router.post('/hire-driver', auth, async (req, res) => {
  await createRideListing(req, res, 'hire_driver');
});

// Update ride
router.put('/:id', auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        status: 'error',
        error: 'Only ride owner can update this ride'
      });
    }

    const allowedFields = [
      'source', 'destination', 'date', 'time', 'availableSeats', 'pricePerSeat',
      'vehicleType', 'vehicleNumber', 'description', 'preferences', 'route',
      'status', 'contactNumber', 'pickupLocation', 'dropLocation', 'pricing', 'serviceType'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'date') {
          ride.date = new Date(req.body.date);
        } else {
          ride[field] = req.body[field];
        }
      }
    });

    await ride.save();
    await ride.populate('driver', 'name rating isVerified isPremium phone vehicle');

    const serialized = serializeRide(ride);

    res.json({
      status: 'success',
      message: 'Ride updated successfully',
      ride: serialized,
      data: {
        ride: serialized
      }
    });
  } catch (error) {
    console.error('Error updating ride:', error);
    res.status(500).json({ error: 'Server error while updating ride' });
  }
});

// Delete ride
router.delete('/:id', auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        status: 'error',
        error: 'Only ride owner can delete this ride'
      });
    }

    await Ride.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      message: 'Ride deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ride:', error);
    res.status(500).json({ error: 'Server error while deleting ride' });
  }
});

module.exports = router; 
