import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Car, MapPin, DollarSign, 
  Settings, CheckCircle, ArrowRight, ArrowLeft,
  Sparkles
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { createRideSuccess } from '../store/slices/ridesSlice';
import { rideAPI } from '../services/api';
import PageShell from '../components/layout/PageShell';

interface RideFormData {
  source: string;
  destination: string;
  date: string;
  time: string;
  availableSeats: number;
  pricePerSeat: number;
  vehicleType: string;
  vehicleNumber: string;
  description: string;
  preferences: {
    smoking: boolean;
    music: boolean;
    pets: boolean;
    luggage: boolean;
  };
  contactNumber: string;
  pickupLocation: string;
  dropLocation: string;
}

const CreateRide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RideFormData>({
    source: '',
    destination: '',
    date: '',
    time: '',
    availableSeats: 1,
    pricePerSeat: 0,
    vehicleType: '',
    vehicleNumber: '',
    description: '',
    preferences: {
      smoking: false,
      music: true,
      pets: false,
      luggage: true
    },
    contactNumber: '',
    pickupLocation: '',
    dropLocation: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { id: 1, title: 'Route Details', icon: MapPin },
    { id: 2, title: 'Vehicle Info', icon: Car },
    { id: 3, title: 'Preferences', icon: Settings },
    { id: 4, title: 'Review & Submit', icon: CheckCircle }
  ];
  const stepHints: Record<number, string> = {
    1: 'Choose route, time, and seats to help riders decide faster.',
    2: 'Vehicle details improve trust and matching quality.',
    3: 'Set expectations early for a smoother ride experience.',
    4: 'Final review before publishing your ride.'
  };
  const progressPercent = (currentStep / steps.length) * 100;

  const vehicleTypes = [
    { value: 'car', label: 'Car', icon: Car, seats: 4 },
    { value: 'suv', label: 'SUV', icon: Car, seats: 6 },
    { value: 'van', label: 'Van', icon: Car, seats: 8 },
    { value: 'bike', label: 'Bike', icon: Car, seats: 1 }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.source) newErrors.source = 'Source is required';
        if (!formData.destination) newErrors.destination = 'Destination is required';
        if (formData.source === formData.destination) newErrors.destination = 'Source and destination cannot be the same';
        if (!formData.date) newErrors.date = 'Date is required';
        if (new Date(formData.date) < new Date()) newErrors.date = 'Date cannot be in the past';
        if (!formData.time) newErrors.time = 'Time is required';
        if (!formData.contactNumber) newErrors.contactNumber = 'Contact number is required';
        if (!/^[0-9]{10}$/.test(formData.contactNumber)) newErrors.contactNumber = 'Please enter a valid 10-digit phone number';
        break;
      case 2:
        if (!formData.vehicleType) newErrors.vehicleType = 'Vehicle type is required';
        if (!formData.vehicleNumber) newErrors.vehicleNumber = 'Vehicle number is required';
        if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/.test(formData.vehicleNumber)) newErrors.vehicleNumber = 'Please enter a valid vehicle number (e.g., AS01AB1234)';
        if (formData.pricePerSeat <= 0) newErrors.pricePerSeat = 'Price must be greater than 0';
        if (formData.pricePerSeat > 2000) newErrors.pricePerSeat = 'Price per seat cannot exceed ₹2000';
        break;
      case 3:
        if (!formData.description) newErrors.description = 'Description is required';
        if (formData.description.length < 10) newErrors.description = 'Description must be at least 10 characters long';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      setIsSubmitting(true);
      try {
        const ride = await rideAPI.createRide(formData);
        if (ride) {
          dispatch(createRideSuccess({
            id: String(ride.id),
            driverId: String(ride.driverId || ''),
            driverName: ride.driverName || '',
            source: ride.source,
            destination: ride.destination,
            date: ride.date,
            time: ride.time,
            availableSeats: ride.availableSeats,
            pricePerSeat: ride.pricePerSeat,
            vehicleType: ride.vehicleType,
            vehicleNumber: ride.vehicleNumber,
            description: ride.description || '',
            status: ride.status || 'active',
            createdAt: ride.createdAt || new Date().toISOString(),
          }));
        }
                 dispatch(addNotification({
           type: 'success',
           title: 'Success!',
           message: 'Ride created successfully!',
           duration: 5000
         }));
        navigate('/rides');
      } catch (error) {
                 dispatch(addNotification({
           type: 'error',
           title: 'Error!',
           message: 'Failed to create ride. Please try again.',
           duration: 5000
         }));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const updateFormData = (field: keyof RideFormData, value: any) => {
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

  const updatePreferences = (preference: keyof RideFormData['preferences'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();

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
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Create Your <span className="gradient-text">Ride</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-300">
            Share your journey and help others travel sustainably. Set your preferences and let the community find you.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                    currentStep >= step.id
                      ? 'border-cyan-400 bg-cyan-300/20 text-cyan-100'
                      : 'border-white/20 bg-white/5 text-slate-400'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring" }}
                >
                  {currentStep > step.id ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </motion.div>
                
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-cyan-200' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <motion.div
                    className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-cyan-300/70' : 'bg-white/20'
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: currentStep > step.id ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="h-2 w-full rounded-full bg-slate-200/70">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-300"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
            <motion.p
              key={currentStep}
              className="mt-3 text-sm text-slate-300"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {stepHints[currentStep]}
            </motion.p>
          </div>
        </motion.div>

        {/* Form Container */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Route Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      From <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => updateFormData('source', e.target.value)}
                      className={`input-field ${errors.source ? 'border-red-500' : ''}`}
                      placeholder="Enter source city"
                    />
                    {errors.source && (
                      <p className="text-red-500 text-sm mt-1">{errors.source}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      To <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => updateFormData('destination', e.target.value)}
                      className={`input-field ${errors.destination ? 'border-red-500' : ''}`}
                      placeholder="Enter destination city"
                    />
                    {errors.destination && (
                      <p className="text-red-500 text-sm mt-1">{errors.destination}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateFormData('date', e.target.value)}
                      className={`input-field ${errors.date ? 'border-red-500' : ''}`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.date && (
                      <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => updateFormData('time', e.target.value)}
                      className={`input-field ${errors.time ? 'border-red-500' : ''}`}
                    />
                    {errors.time && (
                      <p className="text-red-500 text-sm mt-1">{errors.time}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => updateFormData('contactNumber', e.target.value)}
                      className={`input-field ${errors.contactNumber ? 'border-red-500' : ''}`}
                      placeholder="Enter your contact number"
                    />
                    {errors.contactNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Available Seats
                    </label>
                    <select
                      value={formData.availableSeats}
                                               onChange={(e) => updateFormData('availableSeats', parseInt(e.target.value) || 1)}
                      className="input-field"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(seat => (
                        <option key={seat} value={seat}>{seat} seat{seat > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Vehicle Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Vehicle Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {vehicleTypes.map(vehicle => (
                        <motion.button
                          key={vehicle.value}
                          type="button"
                          onClick={() => updateFormData('vehicleType', vehicle.value)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            formData.vehicleType === vehicle.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <vehicle.icon className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-sm font-medium">{vehicle.label}</div>
                          <div className="text-xs text-slate-500">{vehicle.seats} seats</div>
                        </motion.button>
                      ))}
                    </div>
                    {errors.vehicleType && (
                      <p className="text-red-500 text-sm mt-1">{errors.vehicleType}</p>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.vehicleNumber}
                        onChange={(e) => updateFormData('vehicleNumber', e.target.value.toUpperCase())}
                        className={`input-field ${errors.vehicleNumber ? 'border-red-500' : ''}`}
                        placeholder="e.g., AS01AB1234"
                      />
                      {errors.vehicleNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.vehicleNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Price per Seat (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type="number"
                          value={formData.pricePerSeat}
                          onChange={(e) => updateFormData('pricePerSeat', parseInt(e.target.value) || 0)}
                          className={`input-field pl-10 ${errors.pricePerSeat ? 'border-red-500' : ''}`}
                          placeholder="Enter price per seat"
                          min="0"
                        />
                      </div>
                      {errors.pricePerSeat && (
                        <p className="text-red-500 text-sm mt-1">{errors.pricePerSeat}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Preferences & Description</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    className={`input-field h-32 resize-none ${errors.description ? 'border-red-500' : ''}`}
                    placeholder="Tell passengers about your ride, vehicle, and any special requirements..."
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">
                    Ride Preferences
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'smoking', label: 'Smoking', icon: '🚬' },
                      { key: 'music', label: 'Music', icon: '🎵' },
                      { key: 'pets', label: 'Pets', icon: '🐕' },
                      { key: 'luggage', label: 'Luggage', icon: '🧳' }
                    ].map(pref => (
                      <motion.button
                        key={pref.key}
                        type="button"
                        onClick={() => updatePreferences(pref.key as keyof RideFormData['preferences'], !formData.preferences[pref.key as keyof RideFormData['preferences']])}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.preferences[pref.key as keyof RideFormData['preferences']]
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-green-300'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-2xl mb-2">{pref.icon}</div>
                        <div className="text-sm font-medium">{pref.label}</div>
                        <div className="text-xs">
                          {formData.preferences[pref.key as keyof RideFormData['preferences']] ? 'Allowed' : 'Not Allowed'}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Review & Submit</h2>
                
                <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Route Details</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">From:</span> {formData.source}</p>
                        <p><span className="font-medium">To:</span> {formData.destination}</p>
                        <p><span className="font-medium">Date:</span> {new Date(formData.date).toLocaleDateString()}</p>
                        <p><span className="font-medium">Time:</span> {formData.time}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Vehicle Info</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Type:</span> {formData.vehicleType.toUpperCase()}</p>
                        <p><span className="font-medium">Number:</span> {formData.vehicleNumber}</p>
                        <p><span className="font-medium">Seats:</span> {formData.availableSeats}</p>
                        <p><span className="font-medium">Price:</span> ₹{formData.pricePerSeat} per seat</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Description</h3>
                    <p className="text-sm text-slate-600">{formData.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Preferences</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(formData.preferences).map(([key, value]) => (
                        <span
                          key={key}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            value
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {key}: {value ? 'Allowed' : 'Not Allowed'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-8 border-t border-slate-200">
            <motion.button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg border-2 transition-all ${
                currentStep === 1
                  ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'border-slate-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
              }`}
              whileHover={currentStep !== 1 ? { scale: 1.05 } : {}}
              whileTap={currentStep !== 1 ? { scale: 0.95 } : {}}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </motion.button>

            {currentStep < steps.length ? (
              <motion.button
                onClick={handleNext}
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Next</span>
                <motion.span
                  className="ml-2 inline-flex"
                  animate={{ x: [0, 2, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span className="ml-2">Creating Ride...</span>
                  </>
                ) : (
                  <>
                    <span>Create Ride</span>
                    <Sparkles className="w-4 h-4 ml-2" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default CreateRide; 
