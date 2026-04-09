import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Car, User, Phone, MapPin, Clock, DollarSign, 
  Shield, CheckCircle, ArrowRight, AlertCircle, Users
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { driverAPI } from '../services/api';
import PageShell from '../components/layout/PageShell';

interface DriverFormData {
  name: string;
  phone: string;
  experience: number;
  licenseNumber: string;
  location: string;
  pricePerHour: number;
  availability: string;
}

const BecomeDriver: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof DriverFormData, string>>>({});
  
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    phone: '',
    experience: 0,
    licenseNumber: '',
    location: '',
    pricePerHour: 0,
    availability: 'flexible'
  });

  const availabilityOptions = [
    { value: 'full-time', label: 'Full Time', description: 'Available throughout the week' },
    { value: 'part-time', label: 'Part Time', description: 'Available on specific hours' },
    { value: 'weekend', label: 'Weekend Only', description: 'Available on weekends' },
    { value: 'flexible', label: 'Flexible', description: 'Available on call' }
  ];

  const validateForm = () => {
    const newErrors: Partial<Record<keyof DriverFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian phone number';
    }

    if (!formData.experience || formData.experience < 0) {
      newErrors.experience = 'Experience is required';
    } else if (formData.experience > 50) {
      newErrors.experience = 'Experience seems unrealistic';
    }

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    } else if (!/^[A-Z]{2}\d{2}\s\d{4}\s\d{7}$/.test(formData.licenseNumber.toUpperCase())) {
      newErrors.licenseNumber = 'Please enter a valid Indian license number format (e.g., DL12 3456 789012)';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.pricePerHour || formData.pricePerHour < 50) {
      newErrors.pricePerHour = 'Minimum price per hour is Rs. 50';
    } else if (formData.pricePerHour > 5000) {
      newErrors.pricePerHour = 'Maximum price per hour is Rs. 5000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await driverAPI.register({
        ...formData,
        licenseNumber: formData.licenseNumber.toUpperCase()
      });
      
      dispatch(addNotification({
        type: 'success',
        title: 'Driver Registration Successful!',
        message: 'Your driver profile has been created. You can now accept ride requests.',
        duration: 5000
      }));
      
      navigate('/driver-services');
      
    } catch (error: any) {
      console.error('Driver registration error:', error);
      
      let errorMessage = 'Failed to register driver. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors?.length > 0) {
        errorMessage = error.response.data.errors.join(', ');
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage,
        duration: 5000
      }));
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof DriverFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <PageShell className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-4 rounded-full">
              <Car className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Become a <span className="gradient-text">Driver</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-300">
            Join our network of professional drivers and start earning by helping people travel safely.
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          {[
            {
              icon: DollarSign,
              title: 'Flexible Earnings',
              description: 'Set your own rates and work when you want'
            },
            {
              icon: Shield,
              title: 'Insurance Coverage',
              description: 'Comprehensive insurance for all registered drivers'
            },
            {
              icon: Users,
              title: 'Growing Network',
              description: 'Connect with thousands of riders daily'
            }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              className="card text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
            >
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-3 rounded-full">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
              <p className="text-slate-300">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Registration Form */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Driver Registration</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                  placeholder="Enter 10-digit phone number"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Experience (years) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.experience}
                  onChange={(e) => updateFormData('experience', parseInt(e.target.value) || 0)}
                  className={`input-field ${errors.experience ? 'border-red-500' : ''}`}
                  placeholder="Years of driving experience"
                  min="0"
                  max="50"
                />
                {errors.experience && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.experience}
                  </p>
                )}
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Shield className="inline w-4 h-4 mr-1" />
                  License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                  className={`input-field ${errors.licenseNumber ? 'border-red-500' : ''}`}
                  placeholder="e.g., DL12 3456 789012"
                />
                {errors.licenseNumber && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.licenseNumber}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Service Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  className={`input-field ${errors.location ? 'border-red-500' : ''}`}
                  placeholder="Your service area/city"
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.location}
                  </p>
                )}
              </div>

              {/* Price Per Hour */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1" />
                  Price Per Hour (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.pricePerHour}
                  onChange={(e) => updateFormData('pricePerHour', parseInt(e.target.value) || 0)}
                  className={`input-field ${errors.pricePerHour ? 'border-red-500' : ''}`}
                  placeholder="Minimum Rs. 50"
                  min="50"
                  max="5000"
                />
                {errors.pricePerHour && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.pricePerHour}
                  </p>
                )}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-white mb-4">
                <Clock className="inline w-4 h-4 mr-1" />
                Availability Preference
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availabilityOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.availability === option.value
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    onClick={() => updateFormData('availability', option.value)}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          formData.availability === option.value
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-white/40'
                        }`}
                      >
                        {formData.availability === option.value && (
                          <div className="w-2 h-2 rounded-full bg-white m-0.5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{option.label}</h4>
                        <p className="text-sm text-slate-300">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-8 py-4 rounded-full font-semibold text-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Register as Driver</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default BecomeDriver;
