import axios from 'axios';
import { store } from '../store/store';
import { addNotification } from '../store/slices/notificationSlice';

// MANDATORY environment variables - no fallbacks for production safety
const API_BASE = process.env.REACT_APP_API_URL;

if (!API_BASE) {
  throw new Error('REACT_APP_API_URL environment variable is required. Set it in .env.local for development or in Vercel dashboard for production.');
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const NETWORK_TOAST_KEY = 'rideconnect-network-error-toast';

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    const noResponse = !error.response;
    const looksNetwork =
      noResponse &&
      (error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.message === 'Network Error');

    if (looksNetwork && typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(NETWORK_TOAST_KEY)) {
      sessionStorage.setItem(NETWORK_TOAST_KEY, '1');
      const isProd = process.env.NODE_ENV === 'production';
      const usingDefaultLocal =
        !process.env.REACT_APP_API_URL && typeof window !== 'undefined';

      store.dispatch(
        addNotification({
          type: 'error',
          title: 'Cannot reach API',
          message: isProd
            ? usingDefaultLocal
              ? 'Production build has no REACT_APP_API_URL. In Vercel → Project → Settings → Environment Variables, set REACT_APP_API_URL to your backend (e.g. https://your-api.vercel.app/api), then redeploy.'
              : 'Check that the backend is running, CORS allows this site, and the API URL is correct.'
            : 'Set REACT_APP_API_URL in .env.local file.',
          duration: 12000,
        })
      );
    }

    // Handle specific error cases
    if (error.response?.status === 400) {
      const message = error.response.data?.error || error.response.data?.message || 'Invalid request';
      store.dispatch(
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message,
          duration: 5000,
        })
      );
    }

    if (error.response?.status === 403) {
      store.dispatch(
        addNotification({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to perform this action',
          duration: 5000,
        })
      );
    }

    if (error.response?.status === 404) {
      store.dispatch(
        addNotification({
          type: 'error',
          title: 'Not Found',
          message: 'The requested resource was not found',
          duration: 5000,
        })
      );
    }

    if (error.response?.status === 500) {
      store.dispatch(
        addNotification({
          type: 'error',
          title: 'Server Error',
          message: 'Something went wrong on the server. Please try again later.',
          duration: 5000,
        })
      );
    }

    return Promise.reject(error);
  }
);

// Ride API functions
export const rideAPI = {
  getRides: async (params?: Record<string, unknown>) => {
    const response = await api.get('/rides', { params });
    return response.data.rides || response.data.data?.rides || response.data;
  },

  createRide: async (rideData: object) => {
    const response = await api.post('/rides', rideData);
    return response.data.ride || response.data.data?.ride || response.data;
  },

  getRideById: async (id: string) => {
    const response = await api.get(`/rides/${id}`);
    return response.data.ride || response.data.data?.ride || response.data;
  },

  updateRide: async (id: string, rideData: Record<string, unknown>) => {
    const response = await api.put(`/rides/${id}`, rideData);
    return response.data.ride || response.data.data?.ride || response.data;
  },

  deleteRide: async (id: string) => {
    const response = await api.delete(`/rides/${id}`);
    return response.data;
  },
};

// User API functions
export const userAPI = {
  getProfile: async (userId?: string) => {
    const params = userId ? { userId } : {};
    const response = await api.get('/users/profile', { params });
    return response.data;
  },

  updateProfile: async (userData: Record<string, unknown>) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },

  getUserRides: async (userId?: string) => {
    const params = userId ? { userId } : {};
    const response = await api.get('/users/rides', { params });
    return response.data;
  },
};

// Authentication API functions
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    
    // Handle different response structures from backend
    const authData = response.data;
    const token = authData.token || authData.data?.token;
    const user = authData.user || authData.data?.user;
    
    if (!token || !user) {
      throw new Error('Invalid authentication response from server');
    }
    
    return { token, user };
  },

  register: async (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    
    // Handle different response structures from backend
    const authData = response.data;
    const token = authData.token || authData.data?.token;
    const user = authData.user || authData.data?.user;
    
    if (!token || !user) {
      throw new Error('Invalid registration response from server');
    }
    
    return { token, user };
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    
    // Handle different response structures from backend
    const userData = response.data;
    const user = userData.user || userData.data?.user || userData;
    
    if (!user) {
      throw new Error('Invalid user data response from server');
    }
    
    return user;
  },
};

export const bookingAPI = {
  create: async (body: {
    rideId: string;
    seats?: number;
    pickupLocation?: string;
    dropLocation?: string;
    specialRequests?: string;
  }) => {
    const response = await api.post('/bookings', body);
    return response.data.data?.booking || response.data.booking || response.data;
  },

  list: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/bookings', { params });
    return response.data.data?.bookings || response.data.bookings || response.data;
  },

  listPendingForDriver: async () => {
    const response = await api.get('/bookings/pending');
    return response.data.data?.bookings || response.data.bookings || response.data;
  },

  accept: async (id: string) => {
    const response = await api.patch(`/bookings/${id}/accept`);
    return response.data.data?.booking || response.data.booking || response.data;
  },

  reject: async (id: string) => {
    const response = await api.patch(`/bookings/${id}/reject`);
    return response.data.data?.booking || response.data.booking || response.data;
  },
};

export const messageAPI = {
  send: async (body: {
    receiverId: string;
    text: string;
    entityId?: string;
    entityType?: 'ride' | 'car' | 'driver' | null;
  }) => {
    const response = await api.post('/messages/send', body);
    return response.data.data?.message || response.data.message || response.data;
  },

  getConversation: async (userId: string, params?: { limit?: number; skip?: number }) => {
    const response = await api.get(`/messages/conversation/${userId}`, { params });
    return response.data.data?.messages || response.data.messages || response.data;
  },

  getConversations: async () => {
    const response = await api.get('/messages');
    return response.data.data?.conversations || response.data.conversations || response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch(`/messages/${id}/read`);
    return response.data.data?.message || response.data.message || response.data;
  },
};

export const notificationAPI = {
  list: async (params?: { limit?: number; skip?: number; unreadOnly?: boolean }) => {
    const response = await api.get('/notifications', { params });
    const notifications = response.data.data?.notifications || response.data.notifications || [];
    const unreadCount = response.data.data?.unreadCount ?? response.data.unreadCount ?? 0;
    return { notifications, unreadCount };
  },

  markAsRead: async (notificationIds?: string[]) => {
    const response = await api.patch('/notifications/mark-read', { notificationIds });
    const unreadCount = response.data.data?.unreadCount ?? response.data.unreadCount ?? 0;
    return { unreadCount };
  },

  markSingleAsRead: async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`);
    const notification = response.data.data?.notification || response.data.notification || null;
    const unreadCount = response.data.data?.unreadCount ?? response.data.unreadCount ?? 0;
    return { notification, unreadCount };
  },

  deleteAll: async () => {
    const response = await api.delete('/notifications');
    return response.data;
  },
};

export const requestAPI = {
  create: async (body: {
    type: 'car' | 'driver';
    entityId: string;
    metadata?: any;
  }) => {
    const response = await api.post('/requests', body);
    return response.data.data?.request || response.data.request || response.data;
  },

  list: async (params?: { type?: string; status?: string; sent?: string }) => {
    const response = await api.get('/requests', { params });
    return response.data.data?.requests || response.data.requests || response.data;
  },

  accept: async (id: string) => {
    const response = await api.patch(`/requests/${id}/accept`);
    return response.data.data?.request || response.data.request || response.data;
  },

  reject: async (id: string) => {
    const response = await api.patch(`/requests/${id}/reject`);
    return response.data.data?.request || response.data.request || response.data;
  },
};

export const achievementAPI = {
  list: async () => {
    const response = await api.get('/achievements');
    return response.data.data.achievements;
  },
};

export const driverAPI = {
  register: async (driverData: {
    name: string;
    phone: string;
    experience: number;
    licenseNumber: string;
    location: string;
    pricePerHour: number;
    availability?: string;
  }) => {
    const response = await api.post('/driver/register', driverData);
    return response.data.data?.driver || response.data.driver || response.data;
  },

  list: async (params?: {
    location?: string;
    availability?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  }) => {
    const response = await api.get('/driver/list', { params });
    return response.data.data?.drivers || response.data.drivers || response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/driver/${id}`);
    return response.data.data?.driver || response.data.driver || response.data;
  },

  updateAvailability: async (id: string, isAvailable: boolean) => {
    const response = await api.patch(`/driver/${id}/availability`, { isAvailable });
    return response.data.data?.driver || response.data.driver || response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/driver/${id}`);
    return response.data;
  },
};

export const carAPI = {
  add: async (carData: {
    ownerName: string;
    carModel: string;
    carNumber: string;
    seats: number;
    pricePerDay: number;
    location: string;
    availability?: string;
    carType?: string;
    fuelType?: string;
    year?: number;
    features?: string[];
  }) => {
    const response = await api.post('/cars/add', carData);
    return response.data.data?.car || response.data.car || response.data;
  },

  list: async (params?: {
    location?: string;
    availability?: string;
    carType?: string;
    fuelType?: string;
    minPrice?: number;
    maxPrice?: number;
    seats?: number;
    sortBy?: string;
  }) => {
    const response = await api.get('/cars/list', { params });
    return response.data.data?.cars || response.data.cars || response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/cars/${id}`);
    return response.data.data?.car || response.data.car || response.data;
  },

  updateAvailability: async (id: string, isAvailable: boolean) => {
    const response = await api.patch(`/cars/${id}/availability`, { isAvailable });
    return response.data.data?.car || response.data.car || response.data;
  },

  rentCar: async (id: string, data: { days?: number; pickupLocation?: string; specialRequests?: string }) => {
    const response = await api.post(`/cars/${id}/rent`, data);
    return response.data.data?.rental || response.data.rental || response.data;
  },

  update: async (id: string, updates: {
    pricePerDay?: number;
    availability?: string;
    features?: string[];
    isAvailable?: boolean;
  }) => {
    const response = await api.patch(`/cars/${id}`, updates);
    return response.data.data?.car || response.data.car || response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/cars/${id}`);
    return response.data;
  },
};

export const analyticsAPI = {
  rideStats: async () => {
    const response = await api.get('/analytics/rides');
    return response.data.data;
  },
};

export const notificationsAPI = {
  list: async () => {
    const response = await api.get('/notifications');
    return response.data.data?.notifications || response.data.notifications || [];
  },
  
  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
};

export default api;
