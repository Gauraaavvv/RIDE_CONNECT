const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const auth = require('../middleware/auth');

// Add a new car for rent (protected route)
router.post('/add', auth, async (req, res) => {
  try {
    const {
      ownerName,
      carModel,
      carNumber,
      seats,
      pricePerDay,
      location,
      availability,
      carType,
      fuelType,
      year,
      features
    } = req.body;

    // Validate required fields
    if (!ownerName || !carModel || !carNumber || !seats || !pricePerDay || !location) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    // Check if car with same number already exists
    const existingCar = await Car.findOne({ carNumber });
    if (existingCar) {
      return res.status(400).json({
        status: 'error',
        message: 'A car with this number is already registered'
      });
    }

    // Create new car with required userId
    const car = new Car({
      ownerName,
      carModel,
      carNumber,
      seats,
      pricePerDay,
      location,
      availability: availability || 'flexible',
      carType: carType || 'sedan',
      fuelType: fuelType || 'petrol',
      year: year || new Date().getFullYear(),
      features: features || [],
      userId: req.user.id  // Required field - always set from authenticated user
    });

    await car.save();

    res.status(201).json({
      status: 'success',
      message: 'Car listed successfully!',
      data: {
        car: {
          id: car._id,
          ownerName: car.ownerName,
          carModel: car.carModel,
          carNumber: car.carNumber,
          seats: car.seats,
          location: car.location,
          pricePerDay: car.pricePerDay,
          availability: car.availability,
          carType: car.carType,
          fuelType: car.fuelType,
          year: car.year,
          features: car.features,
          rating: car.rating,
          isAvailable: car.isAvailable,
          formattedPrice: car.formattedPrice,
          displayName: car.displayName
        }
      }
    });

  } catch (error) {
    console.error('Car listing error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during car listing'
    });
  }
});

// Get all available cars
router.get('/list', async (req, res) => {
  try {
    const { 
      location, 
      availability, 
      carType, 
      fuelType, 
      minPrice, 
      maxPrice, 
      seats,
      sortBy = 'rating' 
    } = req.query;

    // Build filter
    const filter = { isAvailable: true };
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (availability && availability !== 'all') {
      filter.availability = availability;
    }
    
    if (carType && carType !== 'all') {
      filter.carType = carType;
    }
    
    if (fuelType && fuelType !== 'all') {
      filter.fuelType = fuelType;
    }
    
    if (seats) {
      filter.seats = { $gte: parseInt(seats) };
    }
    
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = parseInt(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = parseInt(maxPrice);
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'price-low':
        sort = { pricePerDay: 1 };
        break;
      case 'price-high':
        sort = { pricePerDay: -1 };
        break;
      case 'year':
        sort = { year: -1 };
        break;
      case 'rating':
      default:
        sort = { rating: -1, totalRentals: -1 };
        break;
    }

    const cars = await Car.find(filter)
      .sort(sort)
      .select('-__v')
      .lean();

    res.status(200).json({
      status: 'success',
      message: 'Cars retrieved successfully',
      count: cars.length,
      data: {
        cars
      }
    });

  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching cars'
    });
  }
});

// Get car by ID
router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id)
      .select('-__v')
      .lean();

    if (!car) {
      return res.status(404).json({
        status: 'error',
        message: 'Car not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        car
      }
    });

  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching car'
    });
  }
});

// Update car availability (protected route)
router.patch('/:id/availability', auth, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({
        status: 'error',
        message: 'Car not found'
      });
    }

    // Check if user owns this car or is admin
    if (car.userId && car.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this car'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Car availability updated successfully',
      data: {
        car: {
          id: car._id,
          isAvailable: car.isAvailable
        }
      }
    });

  } catch (error) {
    console.error('Update car availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating car availability'
    });
  }
});

// Update car details (protected route)
router.patch('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['pricePerDay', 'availability', 'features', 'isAvailable'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({
        status: 'error',
        message: 'Car not found'
      });
    }

    // Check if user owns this car or is admin
    if (car.userId && car.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this car'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Car updated successfully',
      data: {
        car
      }
    });

  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating car'
    });
  }
});

// Rent a car (protected route)
router.post('/:id/rent', auth, async (req, res) => {
  try {
    const { days = 1, pickupLocation, specialRequests } = req.body;
    const carId = req.params.id;

    if (!carId) {
      return res.status(400).json({
        status: 'error',
        message: 'carId is required'
      });
    }

    // Validate car exists and is available
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        status: 'error',
        message: 'Car not found'
      });
    }

    if (!car.isAvailable) {
      return res.status(400).json({
        status: 'error',
        message: 'Car is not available for rent'
      });
    }

    if (car.userId && car.userId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot rent your own car'
      });
    }

    // Calculate amount
    const amount = car.pricePerDay * Number(days);

    // Create a rental record (using Booking model for consistency)
    const Booking = require('../models/Booking');
    const rental = new Booking({
      ride: carId, // Store car ID in ride field for consistency
      passenger: req.user.id,
      driver: car.userId,
      seats: car.seats,
      amount,
      pickupLocation: pickupLocation || car.location,
      dropLocation: car.location,
      specialRequests: Array.isArray(specialRequests)
        ? specialRequests
        : specialRequests
          ? [specialRequests]
          : [],
      payment: {
        amount
      },
      serviceType: 'rent_car',
      schedule: {
        days: Number(days)
      }
    });

    await rental.save();

    // Update car rental count
    car.totalRentals = (car.totalRentals || 0) + 1;
    await car.save();

    // Add notification to car owner
    await rental.addNotification(
      'car_rental_request',
      `New car rental request from ${req.user.name} for ${car.carModel}`,
      car.userId
    );

    // Add notification to renter
    await rental.addNotification(
      'car_rental_confirmed',
      `Your rental request for ${car.carModel} has been sent to ${car.ownerName}`,
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: 'Car rental request sent successfully',
      data: {
        rental: await rental.populate(['driver', 'passenger'])
      }
    });

  } catch (error) {
    console.error('Car rental error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create car rental',
      error: error.message
    });
  }
});

// Delete car (protected route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({
        status: 'error',
        message: 'Car not found'
      });
    }

    // Check if user owns this car or is admin
    if (car.userId && car.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this car'
      });
    }

    await Car.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Car deleted successfully'
    });

  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting car'
    });
  }
});

module.exports = router;
