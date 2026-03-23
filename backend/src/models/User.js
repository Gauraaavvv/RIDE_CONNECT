const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        // Remove +91- prefix if present and check if it's a valid 10-digit Indian mobile number
        const cleanPhone = v.replace(/^(\+91-)?/, '');
        // Allow 10-digit numbers starting with 6-9 (Indian mobile numbers)
        return /^[6-9]\d{9}$/.test(cleanPhone);
      },
      message: 'Please enter a valid Indian mobile number (10 digits starting with 6-9)'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiry: {
    type: Date
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRides: {
    type: Number,
    default: 0
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  moneySaved: {
    type: Number,
    default: 0
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
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
    },
    notifications: {
      type: Boolean,
      default: true
    },
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    }
  },
  achievements: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    unlocked: {
      type: Boolean,
      default: false
    },
    unlockedAt: Date,
    progress: {
      type: Number,
      default: 0
    }
  }],
  vehicle: {
    type: {
      type: String,
      enum: ['car', 'suv', 'van', 'bike'],
      required: function() { return this.isDriver; }
    },
    number: {
      type: String,
      required: function() { return this.isDriver; }
    },
    model: String,
    color: String,
    documents: [{
      type: String,
      name: String,
      url: String,
      verified: {
        type: Boolean,
        default: false
      }
    }]
  },
  isDriver: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  kycDocuments: {
    aadhar: {
      number: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    drivingLicense: {
      number: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    panCard: {
      number: String,
      verified: {
        type: Boolean,
        default: false
      }
    }
  },
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      description: String,
      rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  statistics: {
    ridesAsDriver: {
      type: Number,
      default: 0
    },
    ridesAsPassenger: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  badges: [{
    type: {
      type: String,
      enum: ['verified', 'premium', 'safety', 'community', 'eco_friendly'],
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  favoriteRoutes: [{
    source: String,
    destination: String,
    frequency: {
      type: Number,
      default: 1
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure virtuals are included when converting to JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Indexes for better performance
userSchema.index({ isOnline: 1, isDriver: 1 });
userSchema.index({ totalRides: -1 });

// Virtual for full verification status
userSchema.virtual('isFullyVerified').get(function() {
  const k = this.kycDocuments;
  return Boolean(
    this.isVerified &&
    k?.aadhar?.verified &&
    k?.drivingLicense?.verified
  );
});

// Virtual for premium status
userSchema.virtual('hasActivePremium').get(function() {
  return this.isPremium && (!this.premiumExpiry || this.premiumExpiry > new Date());
});

// Virtual for user level
userSchema.virtual('level').get(function() {
  if (this.totalRides >= 100) return 'Expert';
  if (this.totalRides >= 50) return 'Pro';
  if (this.totalRides >= 20) return 'Regular';
  if (this.totalRides >= 5) return 'Beginner';
  return 'New';
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update last active
userSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update statistics
userSchema.methods.updateStatistics = function(rideData) {
  if (rideData.type === 'driver') {
    this.statistics.ridesAsDriver += 1;
    this.statistics.totalEarnings += rideData.amount || 0;
  } else {
    this.statistics.ridesAsPassenger += 1;
    this.statistics.totalSpent += rideData.amount || 0;
  }
  
  this.totalRides += 1;
  this.totalDistance += rideData.distance || 0;
  this.moneySaved += rideData.savings || 0;
  
  return this.save();
};

// Instance method to add achievement
userSchema.methods.addAchievement = function(achievementId, title, description) {
  const existingAchievement = this.achievements.find(a => a.id === achievementId);
  
  if (!existingAchievement) {
    this.achievements.push({
      id: achievementId,
      title,
      description,
      unlocked: true,
      unlockedAt: new Date(),
      progress: 1
    });
  } else if (!existingAchievement.unlocked) {
    existingAchievement.unlocked = true;
    existingAchievement.unlockedAt = new Date();
  }
  
  return this.save();
};

// Instance method to update achievement progress
userSchema.methods.updateAchievementProgress = function(achievementId, progress) {
  const achievement = this.achievements.find(a => a.id === achievementId);
  if (achievement) {
    achievement.progress = progress;
  }
  return this.save();
};

// Static method to find nearby drivers
userSchema.statics.findNearbyDrivers = function(coordinates, maxDistance = 10000) {
  return this.find({
    isDriver: true,
    isOnline: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    }
  }).select('name rating vehicle location');
};

// Static method to get top drivers
userSchema.statics.getTopDrivers = function(limit = 10) {
  return this.find({
    isDriver: true,
    rating: { $gte: 4.0 }
  })
  .sort({ rating: -1, totalRides: -1 })
  .limit(limit)
  .select('name rating totalRides vehicle');
};

// Create indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });
userSchema.index({ rating: -1 });
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema); 
