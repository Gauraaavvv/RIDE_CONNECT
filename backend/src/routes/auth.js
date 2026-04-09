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
    // Log request body for debugging (in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Register request body:', {
        ...req.body,
        password: req.body.password ? '[REDACTED]' : undefined
      });
    }

    const { name, email, phone, password } = req.body;

    // Defensive checks for undefined/null values
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid name is required'
      });
    }

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid email is required'
      });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid phone number is required'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Sanitize inputs
    const sanitizedName = name.trim().substring(0, 50);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhone = phone.trim();

    // Check if user already exists with explicit error handling
    let existingUser;
    try {
      existingUser = await User.findOne({
        $or: [
          { email: sanitizedEmail },
          { phone: sanitizedPhone }
        ]
      }).lean();
    } catch (dbError) {
      console.error('Database error checking existing user:', dbError);
      return res.status(500).json({
        status: 'error',
        message: 'Database error during user validation'
      });
    }

    if (existingUser) {
      const field = existingUser.email === sanitizedEmail ? 'email' : 'phone';
      return res.status(400).json({
        status: 'error',
        message: `User already exists with this ${field}`,
        field: field
      });
    }

    // Create new user with defensive programming
    const user = new User({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      password
    });

    // Save user with explicit error handling
    let savedUser;
    try {
      savedUser = await user.save();
    } catch (saveError) {
      console.error('User save error:', saveError);
      
      // Handle specific MongoDB errors
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyValue)[0];
        return res.status(400).json({
          status: 'error',
          message: `${field} already exists`,
          field: field
        });
      }

      if (saveError.name === 'ValidationError') {
        const errors = Object.values(saveError.errors).map(e => e.message);
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors
        });
      }

      // Handle bcrypt/other errors
      if (saveError.message && saveError.message.includes('bcrypt')) {
        return res.status(500).json({
          status: 'error',
          message: 'Password processing error'
        });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Error saving user to database'
      });
    }

    // Build response with error handling
    let response;
    try {
      response = buildAuthPayload(savedUser, 'User registered successfully');
    } catch (payloadError) {
      console.error('Error building auth payload:', payloadError);
      return res.status(500).json({
        status: 'error',
        message: 'Error generating authentication response'
      });
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Registration error - Full stack:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration'
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
