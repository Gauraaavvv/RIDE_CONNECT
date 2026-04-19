const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for sending messages
const messageRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each user to 50 messages per 15 minutes
  message: {
    status: 'error',
    message: 'Too many messages sent. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/messages/send
// @desc    Send a message to another user
// @access  Private
router.post('/send', auth, messageRateLimit, async (req, res) => {
  try {
    console.log('[MESSAGE SEND] Sender ID:', req.user.id, 'Body:', { receiverId: req.body.receiverId, textLength: req.body.text?.length });
    const { receiverId, text, entityId, entityType } = req.body;

    // Validation
    if (!receiverId || !text) {
      return res.status(400).json({
        status: 'error',
        message: 'receiverId and text are required'
      });
    }

    if (receiverId === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot send message to yourself'
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        status: 'error',
        message: 'Message text too long (max 2000 characters)'
      });
    }

    // Create message
    const message = new Message({
      senderId: req.user.id,
      receiverId,
      text: text.trim(),
      entityId: entityId || null,
      entityType: entityType || null
    });

    await message.save();
    console.log('[MESSAGE SEND] Message saved:', message._id);

    // Create notification for receiver
    try {
      await Notification.create({
        userId: receiverId,
        type: 'new_message',
        title: 'New Message',
        message: `${req.user.name} sent you a message`,
        metadata: {
          messageId: message._id,
          senderId: req.user.id,
          senderName: req.user.name
        }
      });
    } catch (notifError) {
      console.error('[MESSAGE SEND] Failed to create notification:', notifError);
      // Continue even if notification fails
    }

    // Emit real-time notification via Socket.io
    const io = req.app.get('io');
    if (io) {
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name avatar')
        .populate('receiverId', 'name avatar');
      
      io.to(receiverId).emit('new_message', populatedMessage);
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: {
        message: await Message.findById(message._id)
          .populate('senderId', 'name avatar')
          .populate('receiverId', 'name avatar')
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// @route   GET /api/messages/conversation/:userId
// @desc    Get conversation between current user and another user
// @access  Private
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    if (userId === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot get conversation with yourself'
      });
    }

    const messages = await Message.getConversation(
      req.user.id,
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    // Mark messages as read
    await Message.markConversationAsRead(userId, req.user.id);

    res.status(200).json({
      status: 'success',
      data: { messages }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation',
      error: error.message
    });
  }
});

// @route   GET /api/messages
// @desc    Get all conversations for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Get all unique conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: mongoose.Types.ObjectId(req.user.id) },
            { receiverId: mongoose.Types.ObjectId(req.user.id) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', mongoose.Types.ObjectId(req.user.id)] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', mongoose.Types.ObjectId(req.user.id)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userAvatar: '$user.avatar',
          lastMessage: 1,
          unreadCount: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: { conversations }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversations',
      error: error.message
    });
  }
});

// @route   PATCH /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    // Only receiver can mark as read
    if (message.receiverId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only receiver can mark message as read'
      });
    }

    await message.markAsRead();

    res.status(200).json({
      status: 'success',
      message: 'Message marked as read',
      data: { message }
    });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
});

const mongoose = require('mongoose');

module.exports = router;
