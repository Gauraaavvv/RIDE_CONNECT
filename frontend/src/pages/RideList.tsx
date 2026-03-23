import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Calendar, Clock, Users, 
  Star, Shield, Heart, Car,
  ArrowRight, Eye, MessageCircle, Phone, Crown
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { RootState } from '../store/store';
import { rideAPI, bookingAPI } from '../services/api';
import PageShell from '../components/layout/PageShell';

interface Ride {
  id: string;
  driverName: string;
  source: string;
  destination: string;
  date: string;
  time: string;
  availableSeats: number;
  pricePerSeat: number;
  vehicleType: string;
  vehicleNumber: string;
  description: string;
  rating: number;
  isVerified: boolean;
  isPremium: boolean;
  distance: string;
  duration: string;
  preferences: {
    smoking: boolean;
    music: boolean;
    pets: boolean;
    luggage: boolean;
  };
}

const RideList: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [rides, setRides] = useState<Ride[]>([]);
  const [filteredRides, setFilteredRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    vehicleType: '',
    priceRange: '',
    date: '',
    verified: false,
    premium: false
  });
  const activeFilterCount = [
    selectedFilters.vehicleType,
    selectedFilters.priceRange,
    selectedFilters.verified ? 'verified' : '',
    selectedFilters.premium ? 'premium' : ''
  ].filter(Boolean).length;

  const handleBookRide = async (ride: Ride) => {
    if (!isAuthenticated) {
      dispatch(addNotification({
        type: 'info',
        title: 'Login Required',
        message: 'Please login to book this ride',
        duration: 3000
      }));
      return;
    }

    try {
      await bookingAPI.create({ rideId: ride.id, seats: 1 });
      dispatch(addNotification({
        type: 'success',
        title: 'Ride Booked!',
        message: `Your booking request for ${ride.source} to ${ride.destination} has been sent to ${ride.driverName}. They will confirm soon!`,
        duration: 5000
      }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Could not complete booking. Please try again.';
      dispatch(addNotification({
        type: 'error',
        title: 'Booking failed',
        message: msg,
        duration: 5000
      }));
    }
  };

  const handleViewRide = (ride: Ride) => {
    dispatch(addNotification({
      type: 'info',
      title: 'Ride Details',
      message: `Viewing details for ride from ${ride.source} to ${ride.destination}`,
      duration: 3000
    }));
  };

  const handleMessageDriver = (ride: Ride) => {
    dispatch(addNotification({
      type: 'info',
      title: 'Message Sent!',
      message: `Message sent to ${ride.driverName} about the ride. They will reply soon!`,
      duration: 5000
    }));
  };

  const handleCallDriver = (ride: Ride) => {
    dispatch(addNotification({
      type: 'info',
      title: 'Call Initiated!',
      message: `Calling ${ride.driverName}. Please wait...`,
      duration: 3000
    }));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rides = await rideAPI.getRides({
          serviceType: 'offer_ride',
          availableOnly: 'true',
        });
        const list = Array.isArray(rides) ? rides : [];
        if (cancelled) {
          return;
        }
        const mapped: Ride[] = list.map((r: Record<string, unknown>) => {
          const rawDate = r.date as string | Date | undefined;
          const dateStr =
            typeof rawDate === 'string'
              ? rawDate.slice(0, 10)
              : rawDate
                ? new Date(rawDate).toISOString().slice(0, 10)
                : '';
          const prefs = (r.preferences || {}) as Ride['preferences'];
          return {
            id: String(r.id),
            driverName: String(r.driverName || 'Driver'),
            source: String(r.source || ''),
            destination: String(r.destination || ''),
            date: dateStr,
            time: String(r.time || ''),
            availableSeats: Number(r.remainingSeats ?? r.availableSeats ?? 0),
            pricePerSeat: Number(r.pricePerSeat ?? 0),
            vehicleType: String(r.vehicleType || 'car'),
            vehicleNumber: String(r.vehicleNumber || ''),
            description: String(r.description || ''),
            rating: Number(r.rating ?? 0),
            isVerified: Boolean(r.isVerified),
            isPremium: Boolean(r.isPremium),
            distance: String(r.distance || '—'),
            duration: String(r.duration || '—'),
            preferences: {
              smoking: Boolean(prefs.smoking),
              music: prefs.music !== false,
              pets: Boolean(prefs.pets),
              luggage: prefs.luggage !== false,
            },
          };
        });
        setRides(mapped);
        setFilteredRides(mapped);
      } catch {
        if (!cancelled) {
          dispatch(
            addNotification({
              type: 'error',
              title: 'Could not load rides',
              message: 'Unable to reach the server. Please check your connection and try again.',
              duration: 6000,
            })
          );
          setRides([]);
          setFilteredRides([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    let filtered = rides.filter(ride => {
      const matchesSearch = 
        ride.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.driverName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVehicleType = !selectedFilters.vehicleType || ride.vehicleType === selectedFilters.vehicleType;
      const matchesVerified = !selectedFilters.verified || ride.isVerified;
      const matchesPremium = !selectedFilters.premium || ride.isPremium;
      
      return matchesSearch && matchesVehicleType && matchesVerified && matchesPremium;
    });

    // Apply price range filter
    if (selectedFilters.priceRange) {
      const [min, max] = selectedFilters.priceRange.split('-').map(Number);
      filtered = filtered.filter(ride => ride.pricePerSeat >= min && ride.pricePerSeat <= max);
    }

    setFilteredRides(filtered);
  }, [rides, searchTerm, selectedFilters]);

  const handleFilterChange = (filter: string, value: string | boolean) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filter]: value
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      vehicleType: '',
      priceRange: '',
      date: '',
      verified: false,
      premium: false
    });
    setSearchTerm('');
  };

  if (loading) {
    return (
      <PageShell className="min-h-screen flex items-center justify-center pt-20">
        <motion.div
          className="surface-panel flex flex-col items-center space-y-4 px-10 py-9"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-14 w-14 rounded-full border-4 border-cyan-200/35 border-t-cyan-300"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-slate-200">Finding the perfect rides for you...</p>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Find Your Perfect <span className="gradient-text">Ride</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-300">
            Discover rides from verified drivers across Assam. Save money, make connections, and travel sustainably.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="card mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by source, destination, or driver name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedFilters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="input-field max-w-xs"
              >
                <option value="">All Vehicles</option>
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="bike">Bike</option>
              </select>

              <select
                value={selectedFilters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="input-field max-w-xs"
              >
                <option value="">All Prices</option>
                <option value="0-300">Under ₹300</option>
                <option value="300-500">₹300 - ₹500</option>
                <option value="500-800">₹500 - ₹800</option>
                <option value="800-1000">Above ₹800</option>
              </select>

              <motion.button
                onClick={() => handleFilterChange('verified', !selectedFilters.verified)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedFilters.verified
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-green-500'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Verified Only
              </motion.button>

              <motion.button
                onClick={() => handleFilterChange('premium', !selectedFilters.premium)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedFilters.premium
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-500'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Crown className="w-4 h-4 inline mr-2" />
                Premium
              </motion.button>

              <motion.button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-600 hover:border-red-500 hover:text-red-600 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear All
              </motion.button>
            </div>
          </div>

          <motion.div
            className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <span className="text-slate-600">Filter signal</span>
            <span className="font-medium text-slate-800">
              {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'No active filters'}
            </span>
          </motion.div>
        </motion.div>

        {/* Results Count */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-slate-300">
            Found{' '}
            <motion.span
              key={filteredRides.length}
              className="inline-block font-semibold text-cyan-200"
              initial={{ opacity: 0.2, scale: 0.86, y: 2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {filteredRides.length}
            </motion.span>{' '}
            rides
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </motion.div>

        {/* Rides Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredRides.map((ride, index) => (
              <motion.div
                key={ride.id}
                className="card group relative overflow-hidden hover:shadow-2xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -6, scale: 1.01 }}
                layout
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-100/0 via-cyan-100/0 to-amber-100/0 transition-opacity duration-300 group-hover:from-cyan-100/20 group-hover:to-amber-100/15" />
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {ride.driverName.split(' ').map(n => n[0]).join('')}
                      </div>
                      {ride.isVerified && (
                        <Shield className="absolute -bottom-1 -right-1 w-4 h-4 text-blue-500 bg-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{ride.driverName}</h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-slate-600 ml-1">{ride.rating}</span>
                        </div>
                        {ride.isPremium && (
                          <div className="flex items-center text-purple-600">
                            <Crown className="w-4 h-4" />
                            <span className="text-sm ml-1">Premium</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Heart className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Route */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-slate-800">{ride.source}</span>
                    </div>
                    <motion.div
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </motion.div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-slate-800">{ride.destination}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(ride.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {ride.time}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{ride.availableSeats} seats</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Car className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {ride.vehicleType.toUpperCase()} • {ride.vehicleNumber}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {ride.distance} • {ride.duration}
                  </div>
                </div>

                {/* Preferences */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(ride.preferences).map(([key, value]) => (
                    <span
                      key={key}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        value
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {key}: {value ? 'Yes' : 'No'}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-4">{ride.description}</p>

                {/* Price and Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <span className="text-2xl font-bold gradient-text">₹{ride.pricePerSeat}</span>
                    <span className="text-sm text-slate-600"> per seat</span>
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      onClick={() => handleViewRide(ride)}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Eye className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleMessageDriver(ride)}
                      className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <MessageCircle className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleCallDriver(ride)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Phone className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleBookRide(ride)}
                      className="btn-primary"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Book Now
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* No Results */}
        {filteredRides.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No rides found</h3>
            <p className="text-slate-600 mb-4">
              Try adjusting your search criteria or check back later for new rides.
            </p>
            <motion.button
              onClick={clearFilters}
              className="btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear Filters
            </motion.button>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
};

export default RideList; 
