const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// MANDATORY environment variable - no fallback for security
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security. Set it in .env file.');
}

const sanitizeUser = (user) => ({
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
  preferences: user.preferences
});

const buildAuthPayload = (user, message) => {
  const token = jwt.sign(
    { userId: user._id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const userData = sanitizeUser(user);
  return {
    status: 'success',
    message,
    token,
    user: userData,
    data: {
      token,
      user: userData
    }
  };
};

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        status: 'error',
        error: 'Name, email, phone, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone }
      ]
    });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        error: existingUser.email === email.toLowerCase()
          ? 'User already exists with this email'
          : 'User already exists with this phone number'
      });
    }

    // Create new user
    const user = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password
    });

    await user.save();

    res.status(201).json(buildAuthPayload(user, 'User registered successfully'));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message || 'Server error during registration'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid credentials'
      });
    }

    res.json(buildAuthPayload(user, 'Login successful'));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Server error during login'
    });
  }
});

// Get currently authenticated user
router.get('/me', auth, async (req, res) => {
  res.json({
    status: 'success',
    data: {
      user: sanitizeUser(req.user)
    }
  });
});

module.exports = router;
