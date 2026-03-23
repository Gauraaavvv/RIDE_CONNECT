import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { addNotification } from '../store/slices/notificationSlice';

interface NotificationData {
  type?: 'error' | 'info' | 'success' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

interface MessageData {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

interface RideUpdateData {
  message: string;
  rideId: string;
  status: string;
}

let socket: Socket | null = null;

// MANDATORY environment variable - no fallback for production safety
const SOCKET_URL = process.env.REACT_APP_WS_URL;

if (!SOCKET_URL) {
  throw new Error('REACT_APP_WS_URL environment variable is required. Set it in .env.local for development or in Vercel dashboard for production.');
}

export const initializeSocket = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('notification', (notification: NotificationData) => {
    store.dispatch(addNotification({
      type: notification.type || 'info',
      title: notification.title || 'Notification',
      message: notification.message,
      duration: notification.duration || 5000
    }));
  });

  socket.on('chat-message', (message: MessageData) => {
    // Handle chat messages
    console.log('New chat message:', message);
  });

  socket.on('ride-update', (update: RideUpdateData) => {
    // Handle ride updates
    console.log('Ride update:', update);
    store.dispatch(addNotification({
      type: 'info',
      title: 'Ride Update',
      message: update.message,
      duration: 5000
    }));
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinRoom = (roomId: string) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit('join-room', roomId);
  }
};

export const sendMessage = (data: any) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit('chat-message', data);
  }
};
