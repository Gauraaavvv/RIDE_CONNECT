const express = require('express');
const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Booking = require('../models/Booking');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/analytics/rides
// @desc    Get ride analytics
// @access  Private
router.get('/rides', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const [asDriver, asPassenger, earningsAgg] = await Promise.all([
      Ride.countDocuments({ driver: userId }),
      Ride.countDocuments({ 'passengers.user': userId }),
      Booking.aggregate([
        {
          $match: {
            driver: userId,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$payment.driverAmount' }
          }
        }
      ])
    ]);

    const user = await User.findById(req.user.id).select('statistics.averageRating');

    res.json({
      status: 'success',
      data: {
        totalRides: asDriver + asPassenger,
        ridesOffered: asDriver,
        ridesJoined: asPassenger,
        completedRides: asDriver,
        totalEarnings: earningsAgg[0]?.total || 0,
        averageRating: user?.statistics?.averageRating || 0
      }
    });
  } catch (error) {
    console.error('Get ride analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get ride analytics'
    });
  }
});

// @route   GET /api/analytics/users
// @desc    Get user analytics
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalUsers, newUsersThisMonth, activeDrivers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ isDriver: true, isActive: true })
    ]);

    res.json({
      status: 'success',
      data: {
        totalUsers,
        activeUsers: activeDrivers,
        newUsersThisMonth
      }
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user analytics'
    });
  }
});

module.exports = router; 