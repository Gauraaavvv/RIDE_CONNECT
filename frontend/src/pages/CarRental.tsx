import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  Car, Calendar, MapPin, Users, Fuel, Settings, 
  Star, Filter, Search, Shield,
  Phone, MessageCircle, Heart
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { rideAPI, bookingAPI, carAPI, requestAPI } from '../services/api';
import { RootState } from '../store/store';
import PageShell from '../components/layout/PageShell';

interface CarListing {
  _id: string;
  userId?: string;
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
  rating: number;
  totalRentals: number;
  isAvailable: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

const CarRental: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [carListings, setCarListings] = useState<CarListing[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const toggleFeatures = (carId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(carId)) {
      newExpanded.delete(carId);
    } else {
      newExpanded.add(carId);
    }
    setExpandedFeatures(newExpanded);
  };

  const handleRentNow = async (car: CarListing) => {
    if (!isAuthenticated) {
      dispatch(
        addNotification({
          type: 'info',
          title: 'Login Required',
          message: 'Please login to rent a car',
          duration: 4000,
        })
      );
      return;
    }

    try {
      await requestAPI.create({
        type: 'car',
        entityId: car._id,
        metadata: {
          carModel: car.carModel,
          carNumber: car.carNumber,
          pricePerDay: car.pricePerDay
        }
      });

      dispatch(
        addNotification({
          type: 'success',
          title: 'Rent Request Sent!',
          message: `Your rent request for ${car.carModel} has been sent to ${car.ownerName}. They will contact you soon.`,
          duration: 5000,
        })
      );
    } catch (error: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Rental failed',
          message: error.response?.data?.message || 'Failed to send rent request',
          duration: 5000,
        })
      );
    }
  };

  const handleMessageOwner = (car: CarListing) => {
    dispatch(addNotification({
      type: 'info',
      title: 'Message Sent!',
      message: `Message sent to ${car.ownerName} about the car. They will reply soon!`,
      duration: 5000,
    }))
  };

  const handleDeleteCar = async (car: CarListing) => {
    if (!isAuthenticated) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this car listing?');
    if (!confirmed) return;

    try {
      await carAPI.delete(car._id);
      setCarListings(carListings.filter(c => c._id !== car._id));
      dispatch(addNotification({
        type: 'success',
        title: 'Car Deleted',
        message: 'Your car listing has been deleted successfully.',
        duration: 3000,
      }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Could not delete car. Please try again.';
      dispatch(addNotification({
        type: 'error',
        title: 'Delete failed',
        message: msg,
        duration: 3000,
      }));
    }
  };

  const handleCallOwner = (car: CarListing) => {
    dispatch(addNotification({
      type: 'info',
      title: 'Call Initiated!',
      message: `Calling ${car.ownerName} about ${car.carModel}. Please wait...`,
      duration: 3000
    }));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const carsData = await carAPI.list();
        if (!cancelled) {
          setCarListings(carsData || []);
        }
      } catch (error) {
        console.error('Failed to fetch cars:', error);
        if (!cancelled) {
          setCarListings([]);
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

  const features = [
    'AC', 'GPS', 'Bluetooth', 'Backup Camera', 'Power Steering',
    'Music System', 'Sunroof', 'Push Start', 'All Wheel Drive'
  ];

  const locations = ['Guwahati', 'Dibrugarh', 'Jorhat', 'Silchar', 'Tinsukia'];

  const filteredCars = carListings.filter(car => {
    const matchesSearch = car.carModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         car.carNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !selectedLocation || car.location === selectedLocation;
    const matchesPrice = car.pricePerDay >= priceRange[0] && car.pricePerDay <= priceRange[1];
    const matchesFeatures = selectedFeatures.length === 0 || 
                           selectedFeatures.every(feature => car.features.includes(feature));
    
    return matchesSearch && matchesLocation && matchesPrice && matchesFeatures;
  });
  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedLocation ? 1 : 0) +
    (selectedDate ? 1 : 0) +
    (priceRange[1] < 5000 ? 1 : 0) +
    (selectedFeatures.length > 0 ? 1 : 0);

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
              Car Rental Services
            </h1>
            <p className="text-slate-300">
              Rent cars for your journey with verified owners and competitive prices
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
                  Search Cars
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by car name or model..."
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pickup Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price Range (₹/day)
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="5000"
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

              {/* Features */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Features
                </label>
                <div className="space-y-2">
                  {features.map(feature => (
                    <label key={feature} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFeatures.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFeatures([...selectedFeatures, feature]);
                          } else {
                            setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-slate-700">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLocation('');
                  setSelectedDate('');
                  setPriceRange([0, 5000]);
                  setSelectedFeatures([]);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Clear All Filters
              </button>
            </motion.div>
          </div>

          {/* Car Listings */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                Available Cars ({listLoading ? '…' : filteredCars.length})
              </h2>
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>All cars verified</span>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} filters active` : 'No filters active'}
                </span>
              </div>
            </div>

            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-200/35 border-t-cyan-300" />
                <p>Loading rental listings…</p>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCars.map((car, index) => (
                <motion.div
                  key={car._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Car Image */}
                  <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-cyan-400/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Car className="w-16 h-16 text-slate-400" />
                      </motion.div>
                    </div>
                    <div className={`absolute top-4 right-4 rounded-full px-2 py-1 text-xs font-medium text-white ${
                      car.isAvailable ? 'bg-emerald-500' : 'bg-red-500'
                    }`}>
                      <div className="inline-flex items-center gap-1.5">
                        {car.isAvailable && (
                          <motion.span
                            className="h-1.5 w-1.5 rounded-full bg-white"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.3, repeat: Infinity }}
                          />
                        )}
                        {car.isAvailable ? 'Available' : 'Not Available'}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-4 left-4 rounded-full bg-white/80 p-2 transition-colors hover:bg-white"
                    >
                      <Heart className="w-4 h-4 text-slate-600" />
                    </motion.button>
                  </div>

                  {/* Car Details */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-1">
                          {car.carModel}
                        </h3>
                        <p className="text-sm text-slate-600">{car.year} • {car.seats} seats</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-indigo-600">₹{car.pricePerDay}</div>
                        <div className="text-sm text-slate-500">per day</div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(car.rating) ? 'text-yellow-400 fill-current' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-slate-600">
                        {car.rating} rating
                      </span>
                    </div>

                    {/* Car Specs */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <Fuel className="w-4 h-4 mr-2" />
                        {car.fuelType}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {car.location}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Users className="w-4 h-4 mr-2" />
                        {car.seats} seats
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Car className="w-4 h-4 mr-2" />
                        {car.carType}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {car.features.slice(0, expandedFeatures.has(car._id) ? car.features.length : 3).map(feature => (
                        <span
                          key={feature}
                          className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                      {car.features.length > 3 && !expandedFeatures.has(car._id) && (
                        <button
                          onClick={() => toggleFeatures(car._id)}
                          className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          +{car.features.length - 3} more
                        </button>
                      )}
                      {car.features.length > 3 && expandedFeatures.has(car._id) && (
                        <button
                          onClick={() => toggleFeatures(car._id)}
                          className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Show less
                        </button>
                      )}
                    </div>

                    {/* Owner Info */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">
                            {car.ownerName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-800">
                            {car.ownerName}
                            {car.verified && (
                              <Shield className="w-3 h-3 text-green-500 ml-1 inline" />
                            )}
                          </div>
                          <div className="text-xs text-slate-600">
                            {car.totalRentals} rentals
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <motion.button
                        onClick={() => handleRentNow(car)}
                        disabled={!car.isAvailable}
                        className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                        whileHover={car.isAvailable ? { scale: 1.03 } : {}}
                        whileTap={car.isAvailable ? { scale: 0.97 } : {}}
                      >
                        Rent Now
                      </motion.button>
                      {isAuthenticated && user && car.userId === user.id && (
                        <motion.button
                          onClick={() => handleDeleteCar(car)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          Delete
                        </motion.button>
                      )}
                      <motion.button 
                        onClick={() => handleMessageOwner(car)}
                        className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <MessageCircle className="w-4 h-4 text-slate-600" />
                      </motion.button>
                      <motion.button 
                        onClick={() => handleCallOwner(car)}
                        className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <Phone className="w-4 h-4 text-slate-600" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredCars.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Car className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No cars available yet
                </h3>
                <p className="text-slate-600 mb-6">
                  List your car first to start earning from rentals!
                </p>
                <motion.button
                  onClick={() => window.location.href = '/list-car'}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  List Your Car
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

export default CarRental; 
