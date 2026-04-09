import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Car, User, MapPin, DollarSign, Settings, Calendar, 
  Shield, CheckCircle, ArrowRight, AlertCircle, Zap, Users
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { carAPI } from '../services/api';
import PageShell from '../components/layout/PageShell';

interface CarFormData {
  ownerName: string;
  carModel: string;
  carNumber: string;
  seats: number;
  pricePerDay: number;
  location: string;
  availability: string;
  carType: string;
  fuelType: string;
  year: number;
  features: string[];
}

const ListCar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CarFormData, string>>>({});
  
  const [formData, setFormData] = useState<CarFormData>({
    ownerName: '',
    carModel: '',
    carNumber: '',
    seats: 4,
    pricePerDay: 0,
    location: '',
    availability: 'flexible',
    carType: 'sedan',
    fuelType: 'petrol',
    year: new Date().getFullYear(),
    features: []
  });

  const availabilityOptions = [
    { value: 'always', label: 'Always Available', description: 'Available 24/7 for rentals' },
    { value: 'weekdays', label: 'Weekdays Only', description: 'Available Monday to Friday' },
    { value: 'weekends', label: 'Weekends Only', description: 'Available Saturday and Sunday' },
    { value: 'flexible', label: 'Flexible', description: 'Available on request' }
  ];

  const carTypeOptions = [
    { value: 'sedan', label: 'Sedan', description: 'Comfortable family car' },
    { value: 'suv', label: 'SUV', description: 'Spacious and versatile' },
    { value: 'hatchback', label: 'Hatchback', description: 'Compact and efficient' },
    { value: 'luxury', label: 'Luxury', description: 'Premium experience' },
    { value: 'sports', label: 'Sports', description: 'High-performance vehicle' },
    { value: 'electric', label: 'Electric', description: 'Eco-friendly option' }
  ];

  const fuelTypeOptions = [
    { value: 'petrol', label: 'Petrol' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'electric', label: 'Electric' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'cng', label: 'CNG' }
  ];

  const featureOptions = [
    { value: 'ac', label: 'Air Conditioning', icon: 'AC' },
    { value: 'music', label: 'Music System', icon: 'Music' },
    { value: 'gps', label: 'GPS Navigation', icon: 'GPS' },
    { value: 'usb', label: 'USB Charging', icon: 'USB' },
    { value: 'bluetooth', label: 'Bluetooth', icon: 'BT' },
    { value: 'airbags', label: 'Airbags', icon: 'ABS' },
    { value: 'abs', label: 'ABS', icon: 'ABS' },
    { value: 'parking-sensor', label: 'Parking Sensors', icon: 'PS' }
  ];

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CarFormData, string>> = {};

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    } else if (formData.ownerName.length < 3) {
      newErrors.ownerName = 'Name must be at least 3 characters';
    }

    if (!formData.carModel.trim()) {
      newErrors.carModel = 'Car model is required';
    }

    if (!formData.carNumber.trim()) {
      newErrors.carNumber = 'Car number is required';
    } else if (!/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(formData.carNumber.toUpperCase())) {
      newErrors.carNumber = 'Please enter a valid Indian car number format (e.g., DL12AB1234)';
    }

    if (!formData.seats || formData.seats < 2 || formData.seats > 8) {
      newErrors.seats = 'Car must have between 2 and 8 seats';
    }

    if (!formData.pricePerDay || formData.pricePerDay < 500) {
      newErrors.pricePerDay = 'Minimum price per day is Rs. 500';
    } else if (formData.pricePerDay > 10000) {
      newErrors.pricePerDay = 'Maximum price per day is Rs. 10000';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formData.year < 2000 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = `Year must be between 2000 and ${new Date().getFullYear() + 1}`;
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
      await carAPI.add({
        ...formData,
        carNumber: formData.carNumber.toUpperCase()
      });
      
      dispatch(addNotification({
        type: 'success',
        title: 'Car Listed Successfully!',
        message: 'Your car is now available for rent. Users can book it through the Rent Car page.',
        duration: 5000
      }));
      
      navigate('/car-rental');
      
    } catch (error: any) {
      console.error('Car listing error:', error);
      
      let errorMessage = 'Failed to list car. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors?.length > 0) {
        errorMessage = error.response.data.errors.join(', ');
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Listing Failed',
        message: errorMessage,
        duration: 5000
      }));
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof CarFormData, value: any) => {
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

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
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
            <div className="bg-gradient-to-br from-purple-500 to-pink-400 p-4 rounded-full">
              <Car className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            List Your <span className="gradient-text">Car</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-300">
            Rent out your car when you're not using it and earn passive income from your vehicle.
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
              title: 'Passive Income',
              description: 'Earn money from your idle car'
            },
            {
              icon: Shield,
              title: 'Insurance Protected',
              description: 'Comprehensive coverage during rentals'
            },
            {
              icon: Zap,
              title: 'Quick Bookings',
              description: 'Get rental requests instantly'
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
                <div className="bg-gradient-to-br from-purple-500 to-pink-400 p-3 rounded-full">
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
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Car Details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Owner Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Owner Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => updateFormData('ownerName', e.target.value)}
                  className={`input-field ${errors.ownerName ? 'border-red-500' : ''}`}
                  placeholder="Enter your full name"
                />
                {errors.ownerName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.ownerName}
                  </p>
                )}
              </div>

              {/* Car Model */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Car className="inline w-4 h-4 mr-1" />
                  Car Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.carModel}
                  onChange={(e) => updateFormData('carModel', e.target.value)}
                  className={`input-field ${errors.carModel ? 'border-red-500' : ''}`}
                  placeholder="e.g., Maruti Swift Dzire"
                />
                {errors.carModel && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.carModel}
                  </p>
                )}
              </div>

              {/* Car Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Shield className="inline w-4 h-4 mr-1" />
                  Car Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.carNumber}
                  onChange={(e) => updateFormData('carNumber', e.target.value)}
                  className={`input-field ${errors.carNumber ? 'border-red-500' : ''}`}
                  placeholder="e.g., DL12AB1234"
                />
                {errors.carNumber && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.carNumber}
                  </p>
                )}
              </div>

              {/* Seats */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Users className="inline w-4 h-4 mr-1" />
                  Number of Seats <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.seats}
                  onChange={(e) => updateFormData('seats', parseInt(e.target.value))}
                  className={`input-field ${errors.seats ? 'border-red-500' : ''}`}
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num} seats</option>
                  ))}
                </select>
                {errors.seats && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.seats}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  className={`input-field ${errors.location ? 'border-red-500' : ''}`}
                  placeholder="Your city/area"
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.location}
                  </p>
                )}
              </div>

              {/* Price Per Day */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1" />
                  Price Per Day (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.pricePerDay}
                  onChange={(e) => updateFormData('pricePerDay', parseInt(e.target.value) || 0)}
                  className={`input-field ${errors.pricePerDay ? 'border-red-500' : ''}`}
                  placeholder="Minimum Rs. 500"
                  min="500"
                  max="10000"
                />
                {errors.pricePerDay && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.pricePerDay}
                  </p>
                )}
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Manufacturing Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => updateFormData('year', parseInt(e.target.value))}
                  className={`input-field ${errors.year ? 'border-red-500' : ''}`}
                >
                  {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors.year && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.year}
                  </p>
                )}
              </div>

              {/* Car Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Settings className="inline w-4 h-4 mr-1" />
                  Car Type
                </label>
                <select
                  value={formData.carType}
                  onChange={(e) => updateFormData('carType', e.target.value)}
                  className="input-field"
                >
                  {carTypeOptions.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Zap className="inline w-4 h-4 mr-1" />
                  Fuel Type
                </label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => updateFormData('fuelType', e.target.value)}
                  className="input-field"
                >
                  {fuelTypeOptions.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-white mb-4">
                <Calendar className="inline w-4 h-4 mr-1" />
                Availability
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availabilityOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.availability === option.value
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    onClick={() => updateFormData('availability', option.value)}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          formData.availability === option.value
                            ? 'border-purple-500 bg-purple-500'
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

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-white mb-4">
                <Settings className="inline w-4 h-4 mr-1" />
                Car Features (Optional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {featureOptions.map((feature) => (
                  <div
                    key={feature.value}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                      formData.features.includes(feature.value)
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    onClick={() => toggleFeature(feature.value)}
                  >
                    <div className="text-white font-medium text-sm">{feature.icon}</div>
                    <div className="text-white text-xs mt-1">{feature.label}</div>
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
                className="bg-gradient-to-r from-purple-500 to-pink-400 text-white px-8 py-4 rounded-full font-semibold text-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Listing Car...</span>
                  </>
                ) : (
                  <>
                    <span>List My Car</span>
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

export default ListCar;
