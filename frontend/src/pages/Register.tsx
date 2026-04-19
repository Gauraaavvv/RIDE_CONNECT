import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, User, Phone } from 'lucide-react';
import { loginSuccess } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/notificationSlice';
import { authAPI } from '../services/api';
import { initializeSocket } from '../services/socket';
import PageShell from '../components/layout/PageShell';

const Register: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Format phone number input
    if (name === 'phone') {
      // Remove any non-digit characters
      const cleanPhone = value.replace(/\D/g, '');
      // Limit to 10 digits
      const formattedPhone = cleanPhone.slice(0, 10);
      setFormData({
        ...formData,
        [name]: formattedPhone
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error!',
        message: 'Please enter a valid Indian mobile number (10 digits starting with 6-9)',
        duration: 5000
      }));
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error!',
        message: 'Passwords do not match',
        duration: 5000
      }));
      return;
    }

    setIsLoading(true);
    try {
      const auth = await authAPI.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      localStorage.setItem('token', auth.token);
      dispatch(loginSuccess(auth.user));
      initializeSocket();

      dispatch(addNotification({
        type: 'success',
        title: 'Success!',
        message: 'Account created successfully! Welcome to AssamRideConnect',
        duration: 5000
      }));

      navigate('/');
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        if (backendError.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (backendError.includes('phone')) {
          errorMessage = 'Please enter a valid Indian mobile number (10 digits starting with 6-9).';
        } else if (backendError.includes('email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = backendError;
        }
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage,
        duration: 5000
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell className="flex min-h-screen items-center justify-center px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="surface-panel mx-auto w-full max-w-xl p-8 sm:p-10"
      >
        <div className="text-center mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Create Account</h1>
          <p className="text-slate-300">Join RideConnect today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input-field pl-10"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field pl-10"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="input-field pl-10"
                placeholder="9876543210"
                maxLength={10}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field pl-10 pr-10"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="input-field pl-10 pr-10"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-300">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-cyan-200 hover:text-cyan-100">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </PageShell>
  );
};

export default Register; 
