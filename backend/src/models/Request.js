const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['ride', 'car', 'driver'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
requestSchema.index({ senderId: 1, status: 1 });
requestSchema.index({ receiverId: 1, status: 1 });
requestSchema.index({ entityId: 1, status: 1 });
requestSchema.index({ type: 1, status: 1 });

// Prevent duplicate pending requests
requestSchema.statics.findPendingRequest = async function(senderId, receiverId, type, entityId) {
  return await this.findOne({
    senderId,
    receiverId,
    type,
    entityId,
    status: 'pending'
  });
};

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
