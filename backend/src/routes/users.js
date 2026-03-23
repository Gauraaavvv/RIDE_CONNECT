const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const router = express.Router();

const PROFILE_FIELDS = '-password -wallet.transactions';

const sanitizeProfile = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  isVerified: user.isVerified,
  isPremium: user.isPremium,
  rating: user.rating,
  totalRides: user.totalRides,
  totalDistance: user.totalDistance,
  moneySaved: user.moneySaved,
  joinDate: user.joinDate,
  isDriver: user.isDriver,
  vehicle: user.vehicle,
  preferences: user.preferences,
  emergencyContact: user.emergencyContact,
  statistics: user.statistics,
  achievements: user.achievements
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const requestedUserId = req.query.userId;
    const userId = requestedUserId || req.user.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(userId).select(PROFILE_FIELDS);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If requesting another profile, limit sensitive data.
    const isSelf = req.user.id.toString() === user._id.toString();
    const profile = sanitizeProfile(user);

    if (!isSelf) {
      delete profile.email;
      delete profile.phone;
      delete profile.emergencyContact;
      delete profile.statistics;
      delete profile.achievements;
    }

    res.json({
      status: 'success',
      user: profile,
      data: {
        user: profile
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const disallowedFields = ['password', 'email', '_id', 'wallet', 'statistics', 'isVerified', 'isPremium', 'rating'];
    const updates = { ...req.body };

    disallowedFields.forEach((field) => delete updates[field]);

    if (updates.phone && !/^[6-9]\d{9}$/.test(updates.phone)) {
      return res.status(400).json({
        status: 'error',
        error: 'Please enter a valid Indian mobile number (10 digits starting with 6-9)'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select(PROFILE_FIELDS);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      user: sanitizeProfile(user),
      data: {
        user: sanitizeProfile(user)
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
});

// Get user's rides
router.get('/rides', auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const rides = await Ride.find({
      $or: [
        { driver: userId },
        { 'passengers.user': userId }
      ]
    })
      .populate('driver', 'name rating isVerified')
      .populate('passengers.user', 'name rating isVerified')
      .sort({ createdAt: -1 });

    const bookings = await Booking.find({
      $or: [
        { passenger: userId },
        { driver: userId }
      ]
    })
      .populate('ride', 'source destination date time status serviceType')
      .populate('passenger', 'name rating')
      .populate('driver', 'name rating')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      status: 'success',
      rides,
      bookings,
      data: {
        rides,
        bookings
      }
    });
  } catch (error) {
    console.error('Error fetching user rides:', error);
    res.status(500).json({ error: 'Server error while fetching rides' });
  }
});

module.exports = router; 
