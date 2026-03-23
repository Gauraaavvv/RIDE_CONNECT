const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 4000,
    trim: true
  },
  meta: {
    type: {
      type: String,
      enum: ['user', 'system', 'ai_placeholder'],
      default: 'user'
    }
  }
}, {
  timestamps: true
});

chatMessageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
