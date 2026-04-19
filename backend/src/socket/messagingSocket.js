const Message = require('../models/Message');
const Notification = require('../models/Notification');

const attachMessagingSocket = (io) => {
  io.on('connection', (socket) => {
    // User joins their personal room (already handled in bookingSocket.js)
    socket.on('join', (userId) => {
      if (!userId || typeof userId !== 'string') {
        return;
      }
      socket.join(userId);
    });

    // Send message event
    socket.on('send_message', async (data) => {
      try {
        const { senderId, receiverId, text, entityId, entityType } = data;

        // Validation
        if (!senderId || !receiverId || !text) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        if (senderId === receiverId) {
          socket.emit('error', { message: 'Cannot send message to yourself' });
          return;
        }

        if (text.length > 2000) {
          socket.emit('error', { message: 'Message too long' });
          return;
        }

        // Create message
        const message = new Message({
          senderId,
          receiverId,
          text: text.trim(),
          entityId: entityId || null,
          entityType: entityType || null
        });

        await message.save();

        // Create notification for receiver
        await Notification.create({
          userId: receiverId,
          type: 'new_message',
          title: 'New Message',
          message: `New message received`,
          metadata: {
            messageId: message._id,
            senderId,
            senderName: data.senderName || 'Someone'
          }
        });

        // Populate and emit to receiver
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'name avatar')
          .populate('receiverId', 'name avatar');

        io.to(receiverId).emit('receive_message', populatedMessage);

        // Send confirmation to sender
        socket.emit('message_sent', populatedMessage);
      } catch (error) {
        console.error('Send message socket error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Join conversation room
    socket.on('join_conversation', (data) => {
      const { userId1, userId2 } = data;
      if (!userId1 || !userId2) {
        return;
      }
      const roomId = [userId1, userId2].sort().join('_');
      socket.join(roomId);
    });

    // Leave conversation room
    socket.on('leave_conversation', (data) => {
      const { userId1, userId2 } = data;
      if (!userId1 || !userId2) {
        return;
      }
      const roomId = [userId1, userId2].sort().join('_');
      socket.leave(roomId);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { senderId, receiverId } = data;
      if (!senderId || !receiverId) {
        return;
      }
      socket.to(receiverId).emit('user_typing', { senderId });
    });

    // Stop typing indicator
    socket.on('stop_typing', (data) => {
      const { senderId, receiverId } = data;
      if (!senderId || !receiverId) {
        return;
      }
      socket.to(receiverId).emit('user_stopped_typing', { senderId });
    });
  });
};

const attachCallingSocket = (io) => {
  io.on('connection', (socket) => {
    // WebRTC Signaling Events
    
    // Call user
    socket.on('call_user', (data) => {
      const { callerId, receiverId, callerName, callType } = data;
      if (!callerId || !receiverId) {
        return;
      }
      
      io.to(receiverId).emit('incoming_call', {
        callerId,
        callerName,
        callType: callType || 'audio',
        signalData: data.signalData
      });
    });

    // Accept call
    socket.on('accept_call', (data) => {
      const { callerId, receiverId, signalData } = data;
      if (!callerId || !receiverId) {
        return;
      }
      
      io.to(callerId).emit('call_accepted', {
        receiverId,
        signalData
      });
    });

    // Reject call
    socket.on('reject_call', (data) => {
      const { callerId, receiverId } = data;
      if (!callerId || !receiverId) {
        return;
      }
      
      io.to(callerId).emit('call_rejected', { receiverId });
    });

    // End call
    socket.on('end_call', (data) => {
      const { callerId, receiverId } = data;
      if (!callerId || !receiverId) {
        return;
      }
      
      io.to(receiverId).emit('call_ended', { callerId });
      io.to(callerId).emit('call_ended', { receiverId });
    });

    // WebRTC ICE candidate
    socket.on('ice_candidate', (data) => {
      const { targetUserId, candidate } = data;
      if (!targetUserId || !candidate) {
        return;
      }
      
      io.to(targetUserId).emit('ice_candidate', {
        senderId: socket.userId,
        candidate
      });
    });

    // WebRTC offer
    socket.on('offer', (data) => {
      const { targetUserId, offer } = data;
      if (!targetUserId || !offer) {
        return;
      }
      
      io.to(targetUserId).emit('offer', {
        senderId: socket.userId,
        offer
      });
    });

    // WebRTC answer
    socket.on('answer', (data) => {
      const { targetUserId, answer } = data;
      if (!targetUserId || !answer) {
        return;
      }
      
      io.to(targetUserId).emit('answer', {
        senderId: socket.userId,
        answer
      });
    });
  });
};

module.exports = {
  attachMessagingSocket,
  attachCallingSocket
};
