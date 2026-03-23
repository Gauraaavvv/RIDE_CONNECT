const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['offer_ride', 'rent_car', 'hire_driver'],
    default: 'offer_ride',
    index: true
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    trim: true
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 1
  },
  seatsBooked: {
    type: Number,
    default: 0,
    min: 0
  },
  pricePerSeat: {
    type: Number,
    required: true,
    min: 0
  },
  pricing: {
    perHour: {
      type: Number,
      default: 0,
      min: 0
    },
    perDay: {
      type: Number,
      default: 0,
      min: 0
    },
    baseFare: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  vehicleType: {
    type: String,
    enum: ['car', 'suv', 'van', 'bike'],
    default: 'car'
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  route: {
    distance: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: 0
    },
    waypoints: [{
      type: String,
      trim: true
    }]
  },
  passengers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
      default: 'pending'
    },
    seats: {
      type: Number,
      default: 1,
      min: 1
    },
    pickupLocation: String,
    dropLocation: String,
    reason: String,
    requestedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: {
    smoking: {
      type: Boolean,
      default: false
    },
    music: {
      type: Boolean,
      default: true
    },
    pets: {
      type: Boolean,
      default: false
    },
    luggage: {
      type: Boolean,
      default: true
    }
  },
  contactNumber: {
    type: String,
    trim: true
  },
  pickupLocation: {
    type: String,
    trim: true
  },
  dropLocation: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'in_progress', 'completed', 'cancelled'],
    default: 'active'
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true
});

rideSchema.index({ source: 'text', destination: 'text', description: 'text' });
rideSchema.index({ date: 1, status: 1, serviceType: 1 });
rideSchema.index({ driver: 1, createdAt: -1 });

rideSchema.virtual('remainingSeats').get(function() {
  return Math.max(0, this.availableSeats - this.seatsBooked);
});

rideSchema.virtual('canBook').get(function() {
  return this.status === 'active' && this.remainingSeats > 0;
});

rideSchema.methods.addPassenger = async function(userId, seats = 1, pickupLocation = '', dropLocation = '') {
  if (!this.canBook) {
    throw new Error('Ride is not available for booking');
  }

  if (this.remainingSeats < seats) {
    throw new Error(`Only ${this.remainingSeats} seats available`);
  }

  const existingPassenger = this.passengers.find(
    (passenger) => passenger.user.toString() === userId.toString()
      && ['pending', 'confirmed'].includes(passenger.status)
  );

  if (existingPassenger) {
    throw new Error('Passenger already exists for this ride');
  }

  this.passengers.push({
    user: userId,
    seats,
    pickupLocation,
    dropLocation,
    status: 'pending',
    requestedAt: new Date(),
    updatedAt: new Date()
  });

  this.seatsBooked += seats;
  return this.save();
};

rideSchema.methods.acceptPassenger = async function(passengerId) {
  const passenger = this.passengers.find(
    (entry) => entry.user.toString() === passengerId.toString()
  );

  if (!passenger) {
    throw new Error('Passenger not found in this ride');
  }

  passenger.status = 'confirmed';
  passenger.updatedAt = new Date();
  return this.save();
};

rideSchema.methods.rejectPassenger = async function(passengerId, reason = '') {
  const passenger = this.passengers.find(
    (entry) => entry.user.toString() === passengerId.toString()
  );

  if (!passenger) {
    throw new Error('Passenger not found in this ride');
  }

  if (passenger.status === 'pending' || passenger.status === 'confirmed') {
    this.seatsBooked = Math.max(0, this.seatsBooked - passenger.seats);
  }

  passenger.status = 'rejected';
  passenger.reason = reason;
  passenger.updatedAt = new Date();
  return this.save();
};

rideSchema.methods.startRide = function() {
  if (this.status !== 'active') {
    throw new Error('Only active rides can be started');
  }

  this.status = 'in_progress';
  return this.save();
};

rideSchema.methods.completeRide = function() {
  if (!['active', 'in_progress'].includes(this.status)) {
    throw new Error('Ride cannot be completed');
  }

  this.status = 'completed';
  return this.save();
};

module.exports = mongoose.model('Ride', rideSchema);
