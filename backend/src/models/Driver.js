const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Driver name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience seems unrealistic']
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2}\d{2}\s\d{4}\s\d{7}$/, 'Please enter a valid Indian license number format']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  pricePerHour: {
    type: Number,
    required: [true, 'Price per hour is required'],
    min: [50, 'Minimum price per hour is Rs. 50'],
    max: [5000, 'Maximum price per hour is Rs. 5000']
  },
  availability: {
    type: String,
    required: [true, 'Availability is required'],
    enum: ['full-time', 'part-time', 'weekend', 'flexible'],
    default: 'flexible'
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  totalTrips: {
    type: Number,
    min: [0, 'Total trips cannot be negative'],
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better search performance
driverSchema.index({ location: 1 });
driverSchema.index({ availability: 1 });
driverSchema.index({ isAvailable: 1 });
driverSchema.index({ rating: -1 });

// Virtual for formatted price
driverSchema.virtual('formattedPrice').get(function() {
  return `Rs. ${this.pricePerHour}/hour`;
});

// Pre-save middleware for validation
driverSchema.pre('save', function(next) {
  // Ensure license number is in uppercase
  if (this.licenseNumber) {
    this.licenseNumber = this.licenseNumber.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
