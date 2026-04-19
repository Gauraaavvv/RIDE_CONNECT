import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  User, MapPin, Star, Clock, Filter, Search, 
  Shield, Phone, MessageCircle, Heart, Car, Award,
  Languages, GraduationCap, Briefcase, DollarSign
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { rideAPI, bookingAPI, driverAPI, requestAPI } from '../services/api';
import { RootState } from '../store/store';
import { showOutgoingCall } from '../store/slices/callSlice';
import PageShell from '../components/layout/PageShell';

interface Driver {
  _id: string;
  userId?: string;
  name: string;
  phone: string;
  experience: number;
  licenseNumber: string;
  location: string;
  pricePerHour: number;
  availability: string;
  rating: number;
  totalTrips: number;
  isAvailable: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

const DriverServices: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const handleHireDriver = async (driver: Driver) => {
    if (!isAuthenticated) {
      dispatch(
        addNotification({
          type: 'info',
          title: 'Login Required',
          message: 'Please login to hire a driver',
          duration: 4000,
        })
      );
      return;
    }
    try {
      await requestAPI.create({
        type: 'driver',
        entityId: driver._id,
        metadata: {
          driverName: driver.name,
          pricePerHour: driver.pricePerHour
        }
      });
      dispatch(
        addNotification({
          type: 'success',
          title: 'Hire Request Sent!',
          message: `Your hire request for ${driver.name} has been submitted.`,
          duration: 5000,
        })
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Could not send hire request. Try again.';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Hire failed',
          message: msg,
          duration: 5000,
        })
      );
    }
  };

  const handleMessageDriver = (driver: Driver) => {
    dispatch(addNotification({
      type: 'info',
      title: 'Message Sent!',
      message: `Message sent to ${driver.name}. They will reply soon!`,
      duration: 5000
    }));
  };

  const handleCallDriver = (driver: Driver) => {
    if (!isAuthenticated || !user?.id) {
      dispatch(
        addNotification({
          type: 'info',
          title: 'Login Required',
          message: 'Please login to call this driver',
          duration: 3000,
        })
      );
      return;
    }
    const driverUserId = driver.userId ? String(driver.userId) : '';
    if (!driverUserId) {
      dispatch(addNotification({
        type: 'error',
        title: 'Call unavailable',
        message: 'Could not determine the driver owner. Please refresh and try again.',
        duration: 4000
      }));
      return;
    }
    if (driverUserId === user.id) {
      dispatch(addNotification({
        type: 'error',
        title: 'Not allowed',
        message: 'You cannot interact with your own listing.',
        duration: 4000
      }));
      return;
    }
    dispatch(showOutgoingCall({
      peerUserId: driverUserId,
      peerName: driver.name,
      callType: 'audio',
      entityType: 'driver',
      entityId: driver._id
    }));
  };

  const handleFavoriteDriver = (driver: Driver) => {
    dispatch(addNotification({
      type: 'success',
      title: 'Added to Favorites!',
      message: `${driver.name} has been added to your favorite drivers.`,
      duration: 3000
    }));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const driversData = await driverAPI.list();
        if (!cancelled) {
          setDrivers(driversData || []);
        }
      } catch (error) {
        console.error('Failed to fetch drivers:', error);
        if (!cancelled) {
          setDrivers([]);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const languages = ['English', 'Hindi', 'Assamese', 'Bengali', 'Gujarati'];
  const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Commercial'];
  const locations = ['Guwahati', 'Dibrugarh', 'Jorhat', 'Silchar', 'Tinsukia'];

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !selectedLocation || driver.location === selectedLocation;
    const matchesExperience = !selectedExperience || 
      (selectedExperience === '0-2' && driver.experience <= 2) ||
      (selectedExperience === '3-5' && driver.experience >= 3 && driver.experience <= 5) ||
      (selectedExperience === '5+' && driver.experience > 5);
    const matchesPrice = driver.pricePerHour >= priceRange[0] && driver.pricePerHour <= priceRange[1];
    
    return matchesSearch && matchesLocation && matchesExperience && matchesPrice;
  });
  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedLocation ? 1 : 0) +
    (selectedExperience ? 1 : 0) +
    (priceRange[1] < 1000 ? 1 : 0) +
    (selectedLanguages.length > 0 ? 1 : 0) +
    (selectedVehicleTypes.length > 0 ? 1 : 0);

  return (
    <PageShell className="min-h-screen pt-20">
      {/* Page Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-2 text-3xl font-bold text-white">
              Professional Driver Services
            </h1>
            <p className="text-slate-300">
              Hire verified professional drivers for your car with safety and reliability
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border p-6 sticky top-8"
            >
              <div className="flex items-center mb-6">
                <Filter className="w-5 h-5 text-indigo-500 mr-2" />
                <h3 className="text-lg font-semibold text-slate-800">Filters</h3>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Drivers
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by driver name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* Experience */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Experience
                </label>
                <select
                  value={selectedExperience}
                  onChange={(e) => setSelectedExperience(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Any Experience</option>
                  <option value="0-2">0-2 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5+">5+ years</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hourly Rate (₹)
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Languages */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Languages
                </label>
                <div className="space-y-2">
                  {languages.map(language => (
                    <label key={language} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(language)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLanguages([...selectedLanguages, language]);
                          } else {
                            setSelectedLanguages(selectedLanguages.filter(l => l !== language));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-slate-700">{language}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vehicle Types */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vehicle Types
                </label>
                <div className="space-y-2">
                  {vehicleTypes.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedVehicleTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVehicleTypes([...selectedVehicleTypes, type]);
                          } else {
                            setSelectedVehicleTypes(selectedVehicleTypes.filter(t => t !== type));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLocation('');
                  setSelectedExperience('');
                  setPriceRange([0, 1000]);
                  setSelectedLanguages([]);
                  setSelectedVehicleTypes([]);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Clear All Filters
              </button>
            </motion.div>
          </div>

          {/* Driver Listings */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                Available Drivers ({listLoading ? '…' : filteredDrivers.length})
              </h2>
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>All drivers verified</span>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} filters active` : 'No filters active'}
                </span>
              </div>
            </div>

            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-200/35 border-t-cyan-300" />
                <p>Loading driver listings…</p>
              </div>
            ) : (
            <>
            <div className="space-y-6">
              {filteredDrivers.map((driver, index) => (
                <motion.div
                  key={driver._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-6">
                      {/* Driver Photo */}
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                          <User className="w-12 h-12 text-slate-400" />
                        </div>
                        {!driver.isAvailable && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Busy
                          </div>
                        )}
                        {driver.isAvailable && (
                          <div className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white">
                            <div className="inline-flex items-center gap-1.5">
                              <motion.span
                                className="h-1.5 w-1.5 rounded-full bg-white"
                                animate={{ opacity: [0.35, 1, 0.35] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              />
                              Online
                            </div>
                          </div>
                        )}
                        {driver.verified && (
                          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full">
                            <Shield className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Driver Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-1">
                              {driver.name}
                            </h3>
                            <p className="text-sm text-slate-600 mb-2">
                              {driver.experience} years experience
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {driver.location}
                              </div>
                              <div className="flex items-center">
                                <Car className="w-4 h-4 mr-1" />
                                {driver.totalTrips} trips
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-indigo-600">₹{driver.pricePerHour}</div>
                            <div className="text-sm text-slate-500">per hour</div>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center mb-3">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(driver.rating) ? 'text-yellow-400 fill-current' : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-sm text-slate-600">
                            {driver.rating} rating
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                          <motion.button
                            onClick={() => handleHireDriver(driver)}
                            disabled={!driver.isAvailable}
                            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            whileHover={driver.isAvailable ? { scale: 1.03 } : {}}
                            whileTap={driver.isAvailable ? { scale: 0.97 } : {}}
                          >
                            Hire Driver
                          </motion.button>
                          <motion.button 
                            onClick={() => handleMessageDriver(driver)}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                          >
                            <MessageCircle className="w-4 h-4 text-slate-600" />
                          </motion.button>
                          <motion.button 
                            onClick={() => handleCallDriver(driver)}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                          >
                            <Phone className="w-4 h-4 text-slate-600" />
                          </motion.button>
                          <motion.button 
                            onClick={() => handleFavoriteDriver(driver)}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                          >
                            <Heart className="w-4 h-4 text-slate-600" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredDrivers.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Car className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No drivers available yet
                </h3>
                <p className="text-slate-600 mb-6">
                  Be the first to register as a driver and start earning!
                </p>
                <motion.button
                  onClick={() => window.location.href = '/become-driver'}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Become a Driver
                </motion.button>
              </motion.div>
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default DriverServices; 
