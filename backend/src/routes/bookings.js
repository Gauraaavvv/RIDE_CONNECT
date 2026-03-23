const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');

const normalizeLocation = (location, fallbackName = 'N/A') => {
  if (!location) {
    return {
      name: fallbackName,
      coordinates: [0, 0]
    };
  }

  if (typeof location === 'string') {
    return {
      name: location,
      coordinates: [0, 0]
    };
  }

  return {
    name: location.name || fallbackName,
    coordinates: Array.isArray(location.coordinates) && location.coordinates.length === 2
      ? location.coordinates
      : [0, 0],
    address: location.address || '',
    instructions: location.instructions || ''
  };
};

const buildPickupDateTime = (rideDate, rideTime) => {
  if (!rideDate) {
    return null;
  }

  const date = new Date(rideDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (typeof rideTime === 'string' && /^\d{2}:\d{2}$/.test(rideTime)) {
    const [hours, minutes] = rideTime.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  }

  return date;
};

const getIdString = (value) => {
  if (!value) {
    return '';
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { rideId, seats = 1, pickupLocation, dropLocation, specialRequests, hours = 0, days = 0 } = req.body;

    if (!rideId) {
      return res.status(400).json({
        status: 'error',
        message: 'rideId is required'
      });
    }

    // Validate ride exists and is available
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found'
      });
    }

    if (ride.driver.toString() === req.user.id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot book your own listing'
      });
    }

    if (!ride.canBook) {
      return res.status(400).json({
        status: 'error',
        message: 'Ride is not available for booking'
      });
    }

    if (ride.remainingSeats < Number(seats)) {
      return res.status(400).json({
        status: 'error',
        message: `Only ${ride.remainingSeats} seats available`
      });
    }

    // Check if user already has a booking for this ride
    const existingBooking = await Booking.findOne({
      ride: rideId,
      passenger: req.user.id,
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    });

    if (existingBooking) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a booking for this ride'
      });
    }

    // Calculate amount
    let amount = ride.pricePerSeat * Number(seats);
    if (ride.serviceType === 'rent_car' && Number(days) > 0) {
      amount = (ride.pricing.perDay || ride.pricePerSeat) * Number(days);
    } else if (ride.serviceType === 'hire_driver' && Number(hours) > 0) {
      amount = (ride.pricing.perHour || ride.pricePerSeat) * Number(hours);
    }

    const normalizedPickup = normalizeLocation(pickupLocation, ride.source);
    const normalizedDrop = normalizeLocation(dropLocation, ride.destination);
    const pickupTime = buildPickupDateTime(ride.date, ride.time);

    // Create booking
    const booking = new Booking({
      ride: rideId,
      passenger: req.user.id,
      driver: ride.driver,
      seats: Number(seats),
      amount,
      pickupLocation: normalizedPickup,
      dropLocation: normalizedDrop,
      specialRequests: Array.isArray(specialRequests)
        ? specialRequests
        : specialRequests
          ? [specialRequests]
          : [],
      payment: {
        amount
      },
      schedule: {
        pickupTime
      }
    });

    await booking.save();

    // Add passenger to ride
    await ride.addPassenger(req.user.id, Number(seats), normalizedPickup.name, normalizedDrop.name);

    // Add notification
    await booking.addNotification(
      'booking_confirmed',
      `Your booking for ride from ${ride.source} to ${ride.destination} has been confirmed`,
      req.user.id
    );

    await booking.addNotification(
      'booking_confirmed',
      `New booking request from ${req.user.name} for your ride`,
      ride.driver
    );

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    let query = {
      $or: [
        { passenger: req.user.id },
        { driver: req.user.id }
      ]
    };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate(['ride', 'driver', 'passenger'])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const total = await Booking.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        bookings,
        pagination: {
          current: pageNumber,
          total: Math.ceil(total / limitNumber),
          hasNext: pageNumber * limitNumber < total,
          hasPrev: pageNumber > 1
        }
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

// @route   GET /api/bookings/stats/overview
// @desc    Get booking statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Booking.getBookingStats(req.user.id);
    
    const overview = {
      total: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
      totalAmount: 0,
      totalEarnings: 0
    };

    stats.forEach(stat => {
      overview.total += stat.count;
      overview.totalAmount += stat.totalAmount;
      
      if (stat._id === 'completed') {
        overview.completed = stat.count;
        overview.totalEarnings += stat.totalAmount;
      } else if (stat._id === 'cancelled') {
        overview.cancelled = stat.count;
      } else if (stat._id === 'pending') {
        overview.pending = stat.count;
      }
    });

    res.json({
      status: 'success',
      data: { overview }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(['ride', 'driver', 'passenger']);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    if (getIdString(booking.passenger) !== req.user.id && 
        getIdString(booking.driver) !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.json({
      status: 'success',
      data: { booking }
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch booking',
      error: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/confirm
// @desc    Confirm booking (driver only)
// @access  Private
router.put('/:id/confirm', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.driver.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only driver can confirm booking'
      });
    }

    await booking.confirmBooking();

    // Update ride passenger status
    const ride = await Ride.findById(booking.ride);
    await ride.acceptPassenger(booking.passenger);

    // Add notifications
    await booking.addNotification(
      'booking_confirmed',
      'Your booking has been confirmed by the driver',
      booking.passenger
    );

    res.json({
      status: 'success',
      message: 'Booking confirmed successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to confirm booking',
      error: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/start
// @desc    Start ride (driver only)
// @access  Private
router.put('/:id/start', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.driver.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only driver can start ride'
      });
    }

    await booking.startRide();

    // Update ride status
    const ride = await Ride.findById(booking.ride);
    await ride.startRide();

    // Add notification
    await booking.addNotification(
      'ride_started',
      'Your ride has started',
      booking.passenger
    );

    res.json({
      status: 'success',
      message: 'Ride started successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Start ride error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start ride',
      error: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/complete
// @desc    Complete ride (driver only)
// @access  Private
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.driver.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only driver can complete ride'
      });
    }

    await booking.completeRide();

    // Update ride status
    const ride = await Ride.findById(booking.ride);
    await ride.completeRide();

    // Update user statistics
    const driver = await User.findById(booking.driver);
    await driver.updateStatistics({
      type: 'driver',
      amount: booking.payment.driverAmount,
      distance: ride.route.distance,
      savings: 0
    });

    const passenger = await User.findById(booking.passenger);
    await passenger.updateStatistics({
      type: 'passenger',
      amount: booking.amount,
      distance: ride.route.distance,
      savings: booking.amount * 0.3 // Assume 30% savings
    });

    // Add notification
    await booking.addNotification(
      'ride_completed',
      'Your ride has been completed',
      booking.passenger
    );

    res.json({
      status: 'success',
      message: 'Ride completed successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete ride',
      error: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.passenger.toString() !== req.user.id && 
        booking.driver.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    await booking.cancelBooking(req.user.id, reason);

    // Update ride if passenger cancelled
    if (booking.passenger.toString() === req.user.id) {
      const ride = await Ride.findById(booking.ride);
      await ride.rejectPassenger(req.user.id, reason);
    }

    // Add notification
    const recipientId = booking.passenger.toString() === req.user.id 
      ? booking.driver 
      : booking.passenger;
    
    await booking.addNotification(
      'cancellation',
      `Booking cancelled by ${req.user.name}`,
      recipientId
    );

    res.json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

// @route   POST /api/bookings/:id/message
// @desc    Send message for booking
// @access  Private
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.passenger.toString() !== req.user.id && 
        booking.driver.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    await booking.addMessage(req.user.id, message);

    res.json({
      status: 'success',
      message: 'Message sent successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// @route   POST /api/bookings/:id/rating
// @desc    Add rating for booking
// @access  Private
router.post('/:id/rating', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.passenger.toString() !== req.user.id && 
        booking.driver.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const recipientId = booking.passenger.toString() === req.user.id 
      ? booking.driver 
      : booking.passenger;

    await booking.addRating(req.user.id, recipientId, rating, review);

    // Update user rating
    const recipient = await User.findById(recipientId);
    const totalRatings = recipient.statistics.totalReviews + 1;
    const newAverageRating = (
      (recipient.statistics.averageRating * recipient.statistics.totalReviews + rating) / totalRatings
    );

    recipient.statistics.averageRating = newAverageRating;
    recipient.statistics.totalReviews = totalRatings;
    await recipient.save();

    res.json({
      status: 'success',
      message: 'Rating added successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add rating',
      error: error.message
    });
  }
});

// @route   POST /api/bookings/:id/sos
// @desc    Trigger SOS for booking
// @access  Private
router.post('/:id/sos', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.passenger.toString() !== req.user.id && 
        booking.driver.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    await booking.triggerSOS(req.user.id);

    // Send emergency notifications
    const recipientId = booking.passenger.toString() === req.user.id 
      ? booking.driver 
      : booking.passenger;

    await booking.addNotification(
      'emergency',
      'SOS triggered! Please check on your ride partner immediately.',
      recipientId
    );

    res.json({
      status: 'success',
      message: 'SOS triggered successfully',
      data: {
        booking: await booking.populate(['ride', 'driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('SOS error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger SOS',
      error: error.message
    });
  }
});

module.exports = router;
