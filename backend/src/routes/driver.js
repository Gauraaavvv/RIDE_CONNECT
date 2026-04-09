const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const auth = require('../middleware/auth');

// Register a new driver
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      phone,
      experience,
      licenseNumber,
      location,
      pricePerHour,
      availability
    } = req.body;

    // Validate required fields
    if (!name || !phone || !experience || !licenseNumber || !location || !pricePerHour) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    // Check if driver with same license number already exists
    const existingDriver = await Driver.findOne({ licenseNumber });
    if (existingDriver) {
      return res.status(400).json({
        status: 'error',
        message: 'A driver with this license number is already registered'
      });
    }

    // Check if driver with same phone number already exists
    const existingPhone = await Driver.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'A driver with this phone number is already registered'
      });
    }

    // Create new driver
    const driver = new Driver({
      name,
      phone,
      experience,
      licenseNumber,
      location,
      pricePerHour,
      availability: availability || 'flexible'
    });

    // If user is authenticated, link the driver to user
    if (req.user) {
      driver.userId = req.user.id;
    }

    await driver.save();

    res.status(201).json({
      status: 'success',
      message: 'Driver registered successfully!',
      data: {
        driver: {
          id: driver._id,
          name: driver.name,
          phone: driver.phone,
          location: driver.location,
          pricePerHour: driver.pricePerHour,
          availability: driver.availability,
          rating: driver.rating,
          isAvailable: driver.isAvailable
        }
      }
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    
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
      message: 'Internal server error during driver registration'
    });
  }
});

// Get all available drivers
router.get('/list', async (req, res) => {
  try {
    const { location, availability, minPrice, maxPrice, sortBy = 'rating' } = req.query;

    // Build filter
    const filter = { isAvailable: true };
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (availability && availability !== 'all') {
      filter.availability = availability;
    }
    
    if (minPrice || maxPrice) {
      filter.pricePerHour = {};
      if (minPrice) filter.pricePerHour.$gte = parseInt(minPrice);
      if (maxPrice) filter.pricePerHour.$lte = parseInt(maxPrice);
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'price-low':
        sort = { pricePerHour: 1 };
        break;
      case 'price-high':
        sort = { pricePerHour: -1 };
        break;
      case 'experience':
        sort = { experience: -1 };
        break;
      case 'rating':
      default:
        sort = { rating: -1, totalTrips: -1 };
        break;
    }

    const drivers = await Driver.find(filter)
      .sort(sort)
      .select('-__v')
      .lean();

    res.status(200).json({
      status: 'success',
      message: 'Drivers retrieved successfully',
      count: drivers.length,
      data: {
        drivers
      }
    });

  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching drivers'
    });
  }
});

// Get driver by ID
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .select('-__v')
      .lean();

    if (!driver) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        driver
      }
    });

  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching driver'
    });
  }
});

// Update driver availability (protected route)
router.patch('/:id/availability', auth, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver not found'
      });
    }

    // Check if user owns this driver or is admin
    if (driver.userId && driver.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this driver'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Driver availability updated successfully',
      data: {
        driver: {
          id: driver._id,
          isAvailable: driver.isAvailable
        }
      }
    });

  } catch (error) {
    console.error('Update driver availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating driver availability'
    });
  }
});

// Delete driver (protected route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver not found'
      });
    }

    // Check if user owns this driver or is admin
    if (driver.userId && driver.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this driver'
      });
    }

    await Driver.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Driver deleted successfully'
    });

  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting driver'
    });
  }
});

module.exports = router;
