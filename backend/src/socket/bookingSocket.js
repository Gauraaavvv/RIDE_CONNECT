const attachBookingSocket = (io) => {
  io.on('connection', (socket) => {
    // Mandatory: Join user's personal room on connection
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

    // Legacy: join_user (deprecated, kept for compatibility)
    socket.on('join_user', (userId) => {
      if (!userId || typeof userId !== 'string') {
        return;
      }
      socket.join(`user:${userId}`);
      console.log('[SOCKET JOIN_USER] socket:', socket.id, 'userId:', userId);
    });

    // Leave user's room
    socket.on('leave_user', (userId) => {
      if (!userId || typeof userId !== 'string') {
        return;
      }
      socket.leave(`user:${userId}`);
    });
  });
};

// Emit booking notification to specific user
const emitBookingNotification = (io, userId, notification) => {
  if (!io || !userId) {
    return;
  }
  io.to(userId).emit('booking:notification', notification);
};

// Emit new booking request to driver
const emitNewBookingRequest = (io, driverId, bookingData) => {
  if (!io || !driverId) {
    return;
  }
  io.to(driverId).emit('booking:new_request', bookingData);
};

// Emit booking status update to passenger
const emitBookingStatusUpdate = (io, passengerId, bookingData) => {
  if (!io || !passengerId) {
    return;
  }
  io.to(passengerId).emit('booking:status_update', bookingData);
};

module.exports = {
  attachBookingSocket,
  emitBookingNotification,
  emitNewBookingRequest,
  emitBookingStatusUpdate
};
