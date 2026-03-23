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
    days?: number;
    hours?: number;
    pickupLocation?: string;
    dropLocation?: string;
  }) => {
    const response = await api.post('/bookings', body);
    return response.data.data?.booking || response.data.booking || response.data;
  },

  list: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/bookings', { params });
    return response.data.data?.bookings || response.data.bookings || response.data;
  },
};

export const achievementAPI = {
  list: async () => {
    const response = await api.get('/achievements');
    return response.data.data.achievements;
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
