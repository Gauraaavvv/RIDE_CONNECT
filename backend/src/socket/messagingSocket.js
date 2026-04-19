const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { resolveReceiverId, normalizeId } = require('../utils/resolveReceiverId');

const attachMessagingSocket = (io) => {
  io.on('connection', (socket) => {
    // User joins their personal room (already handled in bookingSocket.js)
    socket.on('join', (userId, callback) => {
      if (!userId) {
        if (typeof callback === 'function') callback({ status: 'error', message: 'No userId' });
        return;
      }
      const userIdStr = typeof userId === 'string' ? userId : String(userId);
      if (!userIdStr || userIdStr === '[object Object]') {
        if (typeof callback === 'function') callback({ status: 'error', message: 'Invalid userId' });
        return;
      }
      socket.userId = userIdStr;
      socket.data = socket.data || {};
      socket.data.userId = userIdStr;
      socket.join(userIdStr);
      console.log('[SOCKET JOIN] socket:', socket.id, 'userId:', userIdStr);
      if (typeof callback === 'function') callback({ status: 'ok' });
    });

    // Send message event
    socket.on('send_message', async (data) => {
      try {
        const senderId = normalizeId(socket.data?.userId || data.senderId);
        const { receiverId: bodyReceiverId, text, entityId, entityType } = data;

        // Validation
        if (!senderId || !text) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        let resolvedReceiverId = '';
        try {
          const resolved = await resolveReceiverId({ entityType, entityId });
          resolvedReceiverId = resolved?.receiverId ? normalizeId(resolved.receiverId) : normalizeId(bodyReceiverId);
        } catch (e) {
          socket.emit('error', { message: e.message || 'Failed to resolve receiver' });
          return;
        }

        if (!resolvedReceiverId) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        if (normalizeId(senderId) === normalizeId(resolvedReceiverId)) {
          socket.emit('error', { message: 'You cannot interact with your own listing' });
          return;
        }

        if (text.length > 2000) {
          socket.emit('error', { message: 'Message too long' });
          return;
        }

        console.log('[SOCKET MESSAGE] Sender:', senderId);
        console.log('[SOCKET MESSAGE] Receiver:', resolvedReceiverId);
        console.log('[SOCKET MESSAGE] Emitting to room:', resolvedReceiverId);

        // Create message
        const message = new Message({
          senderId,
          receiverId: resolvedReceiverId,
          text: text.trim(),
          entityId: entityId || null,
          entityType: entityType || null
        });

        await message.save();

        try {
          const notification = await Notification.create({
            userId: resolvedReceiverId,
            type: 'new_message',
            title: 'New Message',
            message: `New message received`,
            metadata: {
              messageId: message._id,
              senderId,
              senderName: data.senderName || 'Someone'
            }
          });
          io.to(resolvedReceiverId).emit('new_notification', notification);
        } catch (notifError) {
          console.error('[SOCKET MESSAGE] Failed to create global notification:', notifError);
        }

        // Populate and emit to receiver
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'name avatar')
          .populate('receiverId', 'name avatar');

        io.to(resolvedReceiverId).emit('receive_message', populatedMessage);
        io.to(resolvedReceiverId).emit('new_message', populatedMessage);

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
      const callerId = normalizeId(socket.data?.userId || data.callerId);
      const { receiverId: bodyReceiverId, callerName, callType, entityId, entityType } = data;
      if (!callerId) {
        return;
      }

      (async () => {
        let resolvedReceiverId = '';
        try {
          const resolved = await resolveReceiverId({ entityType, entityId });
          resolvedReceiverId = resolved?.receiverId ? normalizeId(resolved.receiverId) : normalizeId(bodyReceiverId);
        } catch (e) {
          socket.emit('error', { message: e.message || 'Failed to resolve receiver' });
          return;
        }

        if (!resolvedReceiverId) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        if (normalizeId(callerId) === normalizeId(resolvedReceiverId)) {
          socket.emit('error', { message: 'You cannot interact with your own listing' });
          return;
        }

        console.log('[SOCKET CALL] Sender:', callerId);
        console.log('[SOCKET CALL] Receiver:', resolvedReceiverId);
        console.log('[SOCKET CALL] Emitting to room:', resolvedReceiverId);

        // Global notification document for receiver (powers /api/notifications)
        try {
          const notification = await Notification.create({
            userId: resolvedReceiverId,
            type: 'incoming_call',
            title: 'Incoming Call',
            message: `${callerName || 'Someone'} is calling you`,
            metadata: {
              callerId,
              callerName,
              callType: callType || 'audio',
              entityId: entityId || null,
              entityType: entityType || null
            }
          });
          io.to(resolvedReceiverId).emit('new_notification', notification);
        } catch (notifError) {
          console.error('[SOCKET CALL] Failed to create global notification:', notifError);
        }

        io.to(resolvedReceiverId).emit('incoming_call', {
          callerId,
          callerName,
          callType: callType || 'audio',
          signalData: data.signalData,
          entityId: entityId || null,
          entityType: entityType || null
        });
      })();
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
