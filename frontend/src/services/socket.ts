import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';

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
let joinedPromise: Promise<void> | null = null;

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

  // Guarantee a single socket instance for the whole app lifecycle.
  if (socket) {
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
      // Avoid emitting if ensureSocketJoined is doing it or already did it.
      // But actually, on connect we MIGHT need to rejoin if it was a reconnect.
      // socket.on('connect') fires on initial AND reconnect.
      // The old joinedPromise is invalid.
      joinedPromise = null;
      ensureSocketJoined(userId).catch(console.error);
      console.log('[socket] connect -> joining:', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    joinedPromise = null;
  });

  // Ensure join runs on reconnect as well
  socket.on('reconnect', () => {
    const userId = store.getState().auth.user?.id;
    if (userId) {
      joinedPromise = null;
      ensureSocketJoined(userId).catch(console.error);
      console.log('[socket] re-join:', userId);
    }
  });

  socket.on('chat-message', (message: MessageData) => {
    // Handle chat messages
    console.log('New chat message:', message);
  });

  socket.on('ride-update', (update: RideUpdateData) => {
    // Handle ride updates
    console.log('Ride update:', update);
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
    joinedPromise = null;
  }
};

export const ensureSocketJoined = async (userId: string): Promise<void> => {
  const currentSocket = getSocket();
  if (!currentSocket) throw new Error('Socket not initialized');

  if (joinedPromise) {
    return joinedPromise;
  }

  joinedPromise = new Promise((resolve, reject) => {
    const doJoin = () => {
      currentSocket.emit('join', userId, (res: any) => {
        if (res && res.status === 'error') {
          console.error('[socket] join error:', res.message);
          joinedPromise = null; // allow retry
          reject(new Error(res.message));
        } else {
          resolve();
        }
      });
    };

    if (currentSocket.connected) {
      doJoin();
    } else {
      currentSocket.once('connect', doJoin);
      setTimeout(() => {
        if (!currentSocket.connected) {
          joinedPromise = null;
          reject(new Error('Socket connection timeout'));
        }
      }, 5000);
    }
  });

  return joinedPromise;
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
