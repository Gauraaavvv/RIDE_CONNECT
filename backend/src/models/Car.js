const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  carModel: {
    type: String,
    required: [true, 'Car model is required'],
    trim: true,
    maxlength: [50, 'Car model cannot exceed 50 characters']
  },
  carNumber: {
    type: String,
    required: [true, 'Car number is required'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/, 'Please enter a valid Indian car number format']
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [2, 'Car must have at least 2 seats'],
    max: [8, 'Car cannot have more than 8 seats']
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [500, 'Minimum price per day is Rs. 500'],
    max: [10000, 'Maximum price per day is Rs. 10000']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  availability: {
    type: String,
    required: [true, 'Availability is required'],
    enum: ['always', 'weekdays', 'weekends', 'flexible'],
    default: 'flexible'
  },
  carType: {
    type: String,
    enum: ['sedan', 'suv', 'hatchback', 'luxury', 'sports', 'electric'],
    default: 'sedan'
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng'],
    default: 'petrol'
  },
  year: {
    type: Number,
    min: [2000, 'Car year must be 2000 or later'],
    max: [new Date().getFullYear() + 1, 'Car year cannot be in the distant future'],
    default: new Date().getFullYear()
  },
  features: [{
    type: String,
    enum: ['ac', 'music', 'gps', 'usb', 'bluetooth', 'airbags', 'abs', 'parking-sensor']
  }],
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  totalRentals: {
    type: Number,
    min: [0, 'Total rentals cannot be negative'],
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
  images: [{
    type: String,
    default: []
  }],
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
carSchema.index({ location: 1 });
carSchema.index({ availability: 1 });
carSchema.index({ isAvailable: 1 });
carSchema.index({ rating: -1 });
carSchema.index({ pricePerDay: 1 });
carSchema.index({ carType: 1 });

// Virtual for formatted price
carSchema.virtual('formattedPrice').get(function() {
  return `Rs. ${this.pricePerDay}/day`;
});

// Virtual for car display name
carSchema.virtual('displayName').get(function() {
  return `${this.carModel} (${this.carNumber})`;
});

// Pre-save middleware for validation
carSchema.pre('save', function(next) {
  // Ensure car number is in uppercase
  if (this.carNumber) {
    this.carNumber = this.carNumber.toUpperCase();
  }
  
  // Auto-detect car type from model name (simple heuristic)
  const model = this.carModel.toLowerCase();
  if (model.includes('suv') || model.includes('xuv') || model.includes('scorpio') || model.includes('fortuner')) {
    this.carType = 'suv';
  } else if (model.includes('swift') || model.includes('alto') || model.includes('i10') || model.includes('wagon')) {
    this.carType = 'hatchback';
  } else if (model.includes('mercedes') || model.includes('bmw') || model.includes('audi') || model.includes('jaguar')) {
    this.carType = 'luxury';
  } else if (model.includes('tesla') || model.includes('nexon ev') || model.includes('kona')) {
    this.carType = 'electric';
  }
  
  next();
});

module.exports = mongoose.model('Car', carSchema);
