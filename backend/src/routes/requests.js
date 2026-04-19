const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Car = require('../models/Car');
const Driver = require('../models/Driver');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   POST /api/requests
// @desc    Create a new request (car rental or driver hire)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { type, entityId, metadata = {} } = req.body;

    // Validation
    if (!type || !entityId) {
      return res.status(400).json({
        status: 'error',
        message: 'type and entityId are required'
      });
    }

    if (!['ride', 'car', 'driver'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request type. Must be ride, car, or driver'
      });
    }

    let entity;
    let receiverId;

    // Get entity based on type
    if (type === 'car') {
      entity = await Car.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          status: 'error',
          message: 'Car not found'
        });
      }
      receiverId = entity.userId;
    } else if (type === 'driver') {
      entity = await Driver.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          status: 'error',
          message: 'Driver not found'
        });
      }
      receiverId = entity.userId;
    } else {
      // Ride requests handled by existing booking system
      return res.status(400).json({
        status: 'error',
        message: 'Use /api/bookings for ride requests'
      });
    }

    // Prevent self-request
    if (receiverId.toString() === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot request your own listing'
      });
    }

    // Check for duplicate pending request
    const existingRequest = await Request.findPendingRequest(
      req.user.id,
      receiverId,
      type,
      entityId
    );

    if (existingRequest) {
      return res.status(400).json({
        status: 'error',
        message: `You already have a pending ${type} request`
      });
    }

    // Create request
    const newRequest = new Request({
      senderId: req.user.id,
      receiverId,
      type,
      entityId,
      status: 'pending',
      metadata
    });

    await newRequest.save();

    // Create notification for receiver
    await Notification.create({
      userId: receiverId,
      type: 'request_accepted',
      title: `New ${type === 'car' ? 'Car Rental' : 'Driver Hire'} Request`,
      message: `${req.user.name} wants to ${type === 'car' ? 'rent your car' : 'hire you'}`,
      metadata: {
        requestId: newRequest._id,
        senderId: req.user.id,
        senderName: req.user.name,
        type,
        entityId
      }
    });

    // Emit real-time notification via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId.toString()).emit('new_request', {
        requestId: newRequest._id,
        senderName: req.user.name,
        type,
        entityId,
        metadata
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Request sent successfully',
      data: { request: newRequest }
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create request',
      error: error.message
    });
  }
});

// @route   GET /api/requests
// @desc    Get requests for current user (sent or received)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { type = 'all', status = 'all', sent = 'false' } = req.query;

    const filter = {};
    
    if (sent === 'true') {
      filter.senderId = req.user.id;
    } else {
      filter.receiverId = req.user.id;
    }

    if (type !== 'all') {
      filter.type = type;
    }

    if (status !== 'all') {
      filter.status = status;
    }

    const requests = await Request.find(filter)
      .populate('senderId', 'name avatar')
      .populate('receiverId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { requests }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get requests',
      error: error.message
    });
  }
});

// @route   PATCH /api/requests/:id/accept
// @desc    Accept a request (owner only)
// @access  Private
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found'
      });
    }

    // Only receiver can accept
    if (request.receiverId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the receiver can accept this request'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot accept request with status: ${request.status}`
      });
    }

    request.status = 'accepted';
    await request.save();

    // Notify sender
    await Notification.create({
      userId: request.senderId,
      type: 'request_accepted',
      title: 'Request Accepted',
      message: `Your ${request.type} request has been accepted`,
      metadata: {
        requestId: request._id,
        type: request.type,
        entityId: request.entityId
      }
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(request.senderId.toString()).emit('request_status_update', {
        requestId: request._id,
        status: 'accepted',
        message: 'Your request has been accepted'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Request accepted successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to accept request',
      error: error.message
    });
  }
});

// @route   PATCH /api/requests/:id/reject
// @desc    Reject a request (owner only)
// @access  Private
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found'
      });
    }

    // Only receiver can reject
    if (request.receiverId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the receiver can reject this request'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot reject request with status: ${request.status}`
      });
    }

    request.status = 'rejected';
    await request.save();

    // Notify sender
    await Notification.create({
      userId: request.senderId,
      type: 'request_rejected',
      title: 'Request Rejected',
      message: `Your ${request.type} request has been rejected`,
      metadata: {
        requestId: request._id,
        type: request.type,
        entityId: request.entityId
      }
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(request.senderId.toString()).emit('request_status_update', {
        requestId: request._id,
        status: 'rejected',
        message: 'Your request has been rejected'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Request rejected successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject request',
      error: error.message
    });
  }
});

module.exports = router;
