const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  seats: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  pickupLocation: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String,
    instructions: String
  },
  dropLocation: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String,
    instructions: String
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'online', 'wallet'],
      default: 'online'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    gateway: String,
    amount: {
      type: Number,
      required: true
    },
    commission: {
      type: Number,
      default: 0
    },
    driverAmount: {
      type: Number,
      default: 0
    },
    paidAt: Date,
    refundedAt: Date
  },
  schedule: {
    pickupTime: Date,
    estimatedArrival: Date,
    actualPickup: Date,
    actualDrop: Date
  },
  tracking: {
    isActive: {
      type: Boolean,
      default: false
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    checkpoints: [{
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number]
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['departed', 'arrived', 'picked_up', 'dropped_off']
      }
    }]
  },
  communication: {
    messages: [{
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      message: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      read: {
        type: Boolean,
        default: false
      }
    }],
    lastMessageAt: Date
  },
  safety: {
    shareLocation: {
      type: Boolean,
      default: true
    },
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String
    }],
    sosTriggered: {
      type: Boolean,
      default: false
    },
    sosTriggeredAt: Date,
    sosTriggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  rating: {
    passengerToDriver: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      createdAt: Date
    },
    driverToPassenger: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      createdAt: Date
    }
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    cancelledAt: Date,
    refundAmount: Number,
    cancellationFee: Number
  },
  notifications: [{
    type: {
      type: String,
      enum: ['booking_confirmed', 'pickup_reminder', 'driver_arrived', 'ride_started', 'ride_completed', 'payment_received', 'cancellation', 'emergency'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  specialRequests: [{
    type: String,
    enum: ['wheelchair', 'child_seat', 'extra_luggage', 'pet_friendly', 'quiet_ride', 'music_preference']
  }],
  insurance: {
    isActive: {
      type: Boolean,
      default: false
    },
    policyNumber: String,
    coverage: {
      type: Number,
      default: 0
    },
    premium: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    bookingSource: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },
    userAgent: String,
    ipAddress: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
bookingSchema.index({ ride: 1, passenger: 1 });
bookingSchema.index({ passenger: 1, status: 1 });
bookingSchema.index({ driver: 1, status: 1 });
bookingSchema.index({ status: 1, 'schedule.pickupTime': 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ 'tracking.isActive': 1 });

// Virtual for booking duration
bookingSchema.virtual('duration').get(function() {
  if (this.schedule.actualPickup && this.schedule.actualDrop) {
    return Math.round((this.schedule.actualDrop - this.schedule.actualPickup) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for pickup delay
bookingSchema.virtual('pickupDelay').get(function() {
  if (this.schedule.pickupTime && this.schedule.actualPickup) {
    return Math.round((this.schedule.actualPickup - this.schedule.pickupTime) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for booking status
bookingSchema.virtual('isActive').get(function() {
  return ['confirmed', 'in_progress'].includes(this.status);
});

bookingSchema.virtual('canCancel').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

// Pre-save middleware to calculate amounts
bookingSchema.pre('save', function(next) {
  if (this.isModified('amount')) {
    // Calculate commission (10% of booking amount)
    this.payment.commission = Math.round(this.amount * 0.1);
    this.payment.driverAmount = this.amount - this.payment.commission;
  }
  next();
});

// Pre-save middleware to update status
bookingSchema.pre('save', function(next) {
  if (this.isModified('schedule.pickupTime') && this.schedule.pickupTime && this.schedule.pickupTime < new Date()) {
    if (this.status === 'pending') {
      this.status = 'expired';
    }
  }
  next();
});

// Instance method to confirm booking
bookingSchema.methods.confirmBooking = function() {
  if (this.status !== 'pending') {
    throw new Error('Booking cannot be confirmed');
  }
  
  this.status = 'confirmed';
  this.schedule.estimatedArrival = new Date(this.schedule.pickupTime.getTime() + 15 * 60000); // 15 minutes buffer
  
  return this.save();
};

// Instance method to start ride
bookingSchema.methods.startRide = function() {
  if (this.status !== 'confirmed') {
    throw new Error('Ride cannot be started');
  }
  
  this.status = 'in_progress';
  this.tracking.isActive = true;
  this.schedule.actualPickup = new Date();
  
  return this.save();
};

// Instance method to complete ride
bookingSchema.methods.completeRide = function() {
  if (this.status !== 'in_progress') {
    throw new Error('Ride is not in progress');
  }
  
  this.status = 'completed';
  this.tracking.isActive = false;
  this.schedule.actualDrop = new Date();
  
  return this.save();
};

// Instance method to cancel booking
bookingSchema.methods.cancelBooking = function(userId, reason = '') {
  if (!this.canCancel) {
    throw new Error('Booking cannot be cancelled');
  }
  
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: userId,
    reason,
    cancelledAt: new Date()
  };
  
  // Calculate cancellation fee based on time before pickup
  if (!this.schedule.pickupTime) {
    this.cancellation.cancellationFee = 0;
    this.cancellation.refundAmount = this.amount;
    return this.save();
  }

  const timeUntilPickup = this.schedule.pickupTime - new Date();
  const hoursUntilPickup = timeUntilPickup / (1000 * 60 * 60);
  
  if (hoursUntilPickup < 2) {
    this.cancellation.cancellationFee = Math.round(this.amount * 0.5); // 50% fee if less than 2 hours
  } else if (hoursUntilPickup < 24) {
    this.cancellation.cancellationFee = Math.round(this.amount * 0.2); // 20% fee if less than 24 hours
  } else {
    this.cancellation.cancellationFee = 0; // No fee if more than 24 hours
  }
  
  this.cancellation.refundAmount = this.amount - this.cancellation.cancellationFee;
  
  return this.save();
};

// Instance method to add message
bookingSchema.methods.addMessage = function(senderId, message) {
  this.communication.messages.push({
    sender: senderId,
    message
  });
  this.communication.lastMessageAt = new Date();
  
  return this.save();
};

// Instance method to update location
bookingSchema.methods.updateLocation = function(coordinates) {
  this.tracking.currentLocation = {
    type: 'Point',
    coordinates
  };
  
  this.tracking.checkpoints.push({
    location: this.tracking.currentLocation,
    timestamp: new Date()
  });
  
  return this.save();
};

// Instance method to add rating
bookingSchema.methods.addRating = function(fromUserId, toUserId, rating, review = '') {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  
  if (fromUserId.toString() === this.passenger.toString()) {
    this.rating.passengerToDriver = {
      rating,
      review,
      createdAt: new Date()
    };
  } else if (fromUserId.toString() === this.driver.toString()) {
    this.rating.driverToPassenger = {
      rating,
      review,
      createdAt: new Date()
    };
  } else {
    throw new Error('Invalid user for rating');
  }
  
  return this.save();
};

// Instance method to trigger SOS
bookingSchema.methods.triggerSOS = function(userId) {
  this.safety.sosTriggered = true;
  this.safety.sosTriggeredAt = new Date();
  this.safety.sosTriggeredBy = userId;
  
  return this.save();
};

// Instance method to add notification
bookingSchema.methods.addNotification = function(type, message, recipientId) {
  this.notifications.push({
    type,
    message,
    recipient: recipientId
  });
  
  return this.save();
};

// Static method to find active bookings
bookingSchema.statics.findActiveBookings = function(userId) {
  return this.find({
    $or: [
      { passenger: userId },
      { driver: userId }
    ],
    status: { $in: ['confirmed', 'in_progress'] }
  }).populate('ride passenger driver');
};

// Static method to find booking history
bookingSchema.statics.findBookingHistory = function(userId, limit = 20) {
  return this.find({
    $or: [
      { passenger: userId },
      { driver: userId }
    ],
    status: { $in: ['completed', 'cancelled'] }
  })
  .populate('ride passenger driver')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get booking statistics
bookingSchema.statics.getBookingStats = function(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return this.aggregate([
    {
      $match: {
        $or: [
          { passenger: userObjectId },
          { driver: userObjectId }
        ]
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Booking', bookingSchema); 
