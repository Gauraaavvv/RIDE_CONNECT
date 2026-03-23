const attachChatSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => {
      if (!roomId || typeof roomId !== 'string' || roomId.length > 200) {
        return;
      }
      socket.join(`room:${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      if (!roomId || typeof roomId !== 'string') {
        return;
      }
      socket.leave(`room:${roomId}`);
    });
  });
};

const emitChatMessage = (io, roomId, payload) => {
  if (!io || !roomId) {
    return;
  }
  io.to(`room:${roomId}`).emit('chat:message', payload);
};

module.exports = { attachChatSocket, emitChatMessage };
