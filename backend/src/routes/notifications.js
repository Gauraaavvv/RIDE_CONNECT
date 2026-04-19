const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for marking notifications as read
const notificationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each user to 30 requests per minute
  message: {
    status: 'error',
    message: 'Too many notification requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   GET /api/notifications
// @desc    Get notifications for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;

    const filter = { userId: req.user.id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get notifications',
      error: error.message
    });
  }
});

// @route   PATCH /api/notifications/mark-read
// @desc    Mark notifications as read
// @access  Private
router.patch('/mark-read', auth, notificationRateLimit, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    await Notification.markAsRead(req.user.id, notificationIds);

    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Notifications marked as read',
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark single notification as read
// @access  Private
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    // Only owner can mark as read
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to mark this notification'
      });
    }

    notification.isRead = true;
    await notification.save();

    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: {
        notification,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// @route   DELETE /api/notifications
// @desc    Delete all notifications for user
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });

    res.status(200).json({
      status: 'success',
      message: 'All notifications deleted'
    });
  } catch (error) {
    console.error('Delete notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete notifications',
      error: error.message
    });
  }
});

module.exports = router; 