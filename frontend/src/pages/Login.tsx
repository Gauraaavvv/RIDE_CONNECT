import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/notificationSlice';
import { authAPI } from '../services/api';
import { initializeSocket } from '../services/socket';
import PageShell from '../components/layout/PageShell';

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    dispatch(loginStart());

    try {
      const auth = await authAPI.login(formData);
      
      localStorage.setItem('token', auth.token);
      dispatch(loginSuccess(auth.user));
      initializeSocket();
      
      dispatch(addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: 'Successfully logged in to your account.',
        duration: 3000
      }));
      
      navigate('/');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      dispatch(loginFailure(errorMessage));
      
      dispatch(addNotification({
        type: 'error',
        title: 'Login Failed',
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
        className="surface-panel mx-auto w-full max-w-md space-y-8 p-8 sm:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-300">
            Welcome back to RideConnect
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </motion.button>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-300">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-cyan-200 hover:text-cyan-100">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </PageShell>
  );
};

export default Login; 
