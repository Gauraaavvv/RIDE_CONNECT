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

const resolveSocketUrl = () => {
  const wsUrl = process.env.REACT_APP_WS_URL;
  if (wsUrl) {
    return wsUrl;
  }
  // Dev fallback to avoid silently breaking realtime in local setups
  if (process.env.NODE_ENV !== 'production') {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    console.warn('[socket] REACT_APP_WS_URL not set, falling back to REACT_APP_API_URL:', apiUrl);
    return apiUrl;
  }
  throw new Error('REACT_APP_WS_URL environment variable is required. Set it in Vercel dashboard for production.');
};

export const initializeSocket = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  const SOCKET_URL = resolveSocketUrl();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    const userId = store.getState().auth.user?.id;
    if (userId) {
      socket?.emit('join', userId);
      console.log('[socket] join:', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  // Ensure join runs on reconnect as well (connect fires on every successful reconnect)
  socket.on('reconnect', () => {
    const userId = store.getState().auth.user?.id;
    if (userId) {
      socket?.emit('join', userId);
      console.log('[socket] re-join:', userId);
    }
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

  socket.on('receive_message', (message: any) => {
    const senderName = message?.senderId?.name || 'Someone';
    store.dispatch(addNotification({
      type: 'info',
      title: 'New Message',
      message: `${senderName} sent you a message`,
      duration: 5000
    }));
  });

  socket.on('booking:new_request', (data: any) => {
    store.dispatch(addNotification({
      type: 'info',
      title: 'New Booking Request',
      message: `New booking request from ${data?.passenger || 'a passenger'}`,
      duration: 5000
    }));
  });

  socket.on('booking:status_update', (data: any) => {
    store.dispatch(addNotification({
      type: data?.status === 'confirmed' ? 'success' : 'warning',
      title: data?.status === 'confirmed' ? 'Booking Accepted' : 'Booking Update',
      message: data?.message || 'Booking status updated',
      duration: 5000
    }));
  });

  socket.on('incoming_call', (data: any) => {
    const callerName = data?.callerName || 'Someone';
    store.dispatch(addNotification({
      type: 'info',
      title: 'Incoming Call',
      message: `${callerName} is calling you`,
      duration: 7000
    }));
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
